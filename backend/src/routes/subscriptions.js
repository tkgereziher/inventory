import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'omnistock-enterprise-jwt-super-secret-key-2026';

// 1. Get all public subscription plans
router.get('/plans', (req, res) => {
  try {
    const rawPlans = db.prepare(`
      SELECT * FROM subscription_plans 
      WHERE is_active = 1 
      ORDER BY price_etb ASC
    `).all();

    const plans = rawPlans.map(p => ({
      ...p,
      features: p.features_json ? JSON.parse(p.features_json) : []
    }));

    res.json({ plans });
  } catch (err) {
    console.error('Error fetching plans:', err);
    res.status(500).json({ error: 'Failed to fetch subscription plans' });
  }
});

// 2. Get current tenant subscription status
router.get('/current', authMiddleware, (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const subscription = db.prepare(`
      SELECT s.*, p.name as plan_name, p.code as plan_code, p.price_etb, p.price_usd,
             p.max_users, p.max_warehouses, p.max_products, p.features_json
      FROM subscriptions s
      JOIN subscription_plans p ON s.plan_id = p.id
      WHERE s.tenant_id = ?
      ORDER BY s.created_at DESC
      LIMIT 1
    `).get(tenantId);

    const payments = db.prepare(`
      SELECT id, tx_ref, amount, currency, payment_method, payment_channel, status, paid_at, created_at
      FROM payments
      WHERE tenant_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).all(tenantId);

    const counts = {
      users: db.prepare('SELECT COUNT(*) as c FROM users WHERE tenant_id = ?').get(tenantId).c,
      warehouses: db.prepare('SELECT COUNT(*) as c FROM warehouses WHERE tenant_id = ?').get(tenantId).c,
      products: db.prepare('SELECT COUNT(*) as c FROM products WHERE tenant_id = ?').get(tenantId).c,
    };

    res.json({
      subscription: subscription ? {
        ...subscription,
        features: subscription.features_json ? JSON.parse(subscription.features_json) : []
      } : null,
      usage: counts,
      recent_payments: payments
    });
  } catch (err) {
    console.error('Error fetching subscription:', err);
    res.status(500).json({ error: 'Failed to fetch subscription details' });
  }
});

// 3. Initiate Chapa Payment Checkout (Supports New Tenant Onboarding or Existing Tenant Upgrade)
router.post('/checkout/chapa', optionalAuthMiddleware, async (req, res) => {
  try {
    const { 
      planId, 
      billingCycle = 'MONTHLY',
      tenantName, 
      adminName, 
      adminEmail, 
      adminPhone = '+251911000000',
      adminPassword,
      paymentChannel = 'telebirr', // telebirr, cbebirr, awash, card
      returnUrl
    } = req.body;

    const plan = db.prepare('SELECT * FROM subscription_plans WHERE id = ? OR code = ?').get(planId, planId);
    if (!plan) {
      return res.status(404).json({ error: 'Selected subscription plan not found' });
    }

    // Calculate Price (Monthly vs Annual with ~17% discount)
    let amount = plan.price_etb;
    if (billingCycle === 'ANNUAL') {
      amount = Math.round(plan.price_etb * 10); // 10 months price for 12 months
    }

    // Generate unique transaction reference for Chapa
    const tx_ref = `CHAPA-OMNI-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Context metadata
    const meta = {
      planId: plan.id,
      planCode: plan.code,
      billingCycle,
      tenantName: tenantName || req.user?.tenant_name || 'My Organization',
      adminName: adminName || req.user?.name || 'Admin',
      adminEmail: adminEmail || req.user?.email || 'admin@example.com',
      adminPhone,
      adminPasswordHash: adminPassword ? bcrypt.hashSync(adminPassword, 10) : null,
      existingTenantId: req.user?.tenant_id || null,
      existingUserId: req.user?.id || null,
      paymentChannel
    };

    // Store pending payment in database
    db.prepare(`
      INSERT INTO payments (
        id, tenant_id, tx_ref, plan_id, amount, currency, 
        payment_method, payment_channel, status, customer_name, customer_email, customer_phone, meta_json
      ) VALUES (?, ?, ?, ?, ?, 'ETB', 'CHAPA', ?, 'PENDING', ?, ?, ?, ?)
    `).run(
      uuidv4(),
      meta.existingTenantId,
      tx_ref,
      plan.id,
      amount,
      paymentChannel,
      meta.adminName,
      meta.adminEmail,
      meta.adminPhone,
      JSON.stringify(meta)
    );

    const chapaSecretKey = process.env.CHAPA_SECRET_KEY;
    const isLiveChapa = Boolean(chapaSecretKey && !chapaSecretKey.includes('placeholder'));

    let checkoutUrl = '';

    if (isLiveChapa) {
      // Live Chapa API Call
      try {
        const response = await fetch('https://api.chapa.co/v1/transaction/initialize', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${chapaSecretKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: amount.toString(),
            currency: 'ETB',
            email: meta.adminEmail,
            first_name: meta.adminName.split(' ')[0] || 'User',
            last_name: meta.adminName.split(' ').slice(1).join(' ') || 'Admin',
            phone_number: meta.adminPhone,
            tx_ref: tx_ref,
            callback_url: `${req.protocol}://${req.get('host')}/api/subscriptions/chapa-webhook`,
            return_url: returnUrl || `http://localhost:5173/payment/callback?tx_ref=${tx_ref}`,
            customization: {
              title: `OmniStock - ${plan.name}`,
              description: `${plan.name} (${billingCycle}) Multi-Tenant Cloud Inventory`
            }
          })
        });

        const chapaData = await response.json();
        if (chapaData.status === 'success' && chapaData.data?.checkout_url) {
          checkoutUrl = chapaData.data.checkout_url;
        } else {
          console.warn('Chapa live init fallback to sandbox simulation:', chapaData);
        }
      } catch (chapaErr) {
        console.warn('Chapa live request failed, providing interactive simulator:', chapaErr.message);
      }
    }

    res.json({
      success: true,
      tx_ref,
      amount,
      currency: 'ETB',
      plan: {
        id: plan.id,
        name: plan.name,
        code: plan.code,
        price_etb: amount,
        billing_interval: billingCycle
      },
      paymentChannel,
      isLiveChapa,
      checkoutUrl: checkoutUrl || null,
      message: 'Payment session initialized with Chapa gateway'
    });
  } catch (err) {
    console.error('Chapa checkout init error:', err);
    res.status(500).json({ error: err.message || 'Payment initialization failed' });
  }
});

// 4. Verify Chapa Transaction & Provision Tenant / Subscription
router.post('/verify-payment', async (req, res) => {
  try {
    const { tx_ref, simulationSuccess = true } = req.body;

    if (!tx_ref) {
      return res.status(400).json({ error: 'Missing tx_ref parameter' });
    }

    const payment = db.prepare('SELECT * FROM payments WHERE tx_ref = ?').get(tx_ref);
    if (!payment) {
      return res.status(404).json({ error: 'Transaction record not found' });
    }

    // Parse metadata
    const meta = payment.meta_json ? JSON.parse(payment.meta_json) : {};
    let isSuccess = false;
    let chapaReference = `CHAPA-REF-${Date.now()}`;

    const chapaSecretKey = process.env.CHAPA_SECRET_KEY;
    if (chapaSecretKey && !chapaSecretKey.includes('placeholder')) {
      // Call Chapa live verification endpoint
      try {
        const verifyRes = await fetch(`https://api.chapa.co/v1/transaction/verify/${tx_ref}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${chapaSecretKey}`
          }
        });
        const vData = await verifyRes.json();
        if (vData.status === 'success') {
          isSuccess = true;
          chapaReference = vData.data?.reference || chapaReference;
        }
      } catch (err) {
        console.error('Chapa verification call error:', err);
      }
    } else {
      // Sandbox simulator verification
      isSuccess = Boolean(simulationSuccess);
    }

    if (!isSuccess) {
      db.prepare("UPDATE payments SET status = 'FAILED' WHERE tx_ref = ?").run(tx_ref);
      return res.status(400).json({ 
        success: false, 
        status: 'FAILED',
        message: 'Payment was not verified or was cancelled.' 
      });
    }

    // Payment Successful -> Provision or Upgrade Tenant
    let tenantId = meta.existingTenantId;
    let tenantSlug = '';
    let adminUserId = meta.existingUserId;
    let authToken = null;
    let createdUser = null;
    let createdTenant = null;

    const plan = db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(payment.plan_id);
    const periodDays = meta.billingCycle === 'ANNUAL' ? 365 : 30;
    const periodEnd = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000).toISOString();

    // If new tenant onboarding
    if (!tenantId) {
      tenantId = `tenant-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const baseSlug = (meta.tenantName || 'company').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'tenant';
      tenantSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 5)}`;

      // 1. Create Tenant
      db.prepare(`
        INSERT INTO tenants (id, name, slug, plan, settings_json)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        tenantId,
        meta.tenantName || 'My New Business',
        tenantSlug,
        plan?.code || 'PRO',
        JSON.stringify({
          currency: 'ETB',
          country: 'ET',
          timezone: 'Africa/Addis_Ababa',
          primary_payment_gateway: 'CHAPA'
        })
      );

      // 2. Create Admin User
      adminUserId = `user-${Date.now().toString(36)}`;
      const defaultPasswordHash = meta.adminPasswordHash || bcrypt.hashSync('Password123!', 10);
      
      db.prepare(`
        INSERT INTO users (id, tenant_id, name, email, password_hash, role, status)
        VALUES (?, ?, ?, ?, ?, 'TENANT_ADMIN', 'ACTIVE')
      `).run(
        adminUserId,
        tenantId,
        meta.adminName || 'Admin User',
        meta.adminEmail,
        defaultPasswordHash
      );

      // 3. Create Default Central Warehouse for Tenant
      const whId = `wh-${Date.now().toString(36)}`;
      db.prepare(`
        INSERT INTO warehouses (id, tenant_id, name, code, city, country, capacity_sqm, manager_name)
        VALUES (?, ?, 'Main Warehouse Facility', 'WH-HQ-01', 'Addis Ababa', 'Ethiopia', 5000, ?)
      `).run(whId, tenantId, meta.adminName || 'Admin');

      // 4. Create sample product category
      const catId = uuidv4();
      db.prepare(`
        INSERT INTO categories (id, tenant_id, name, description)
        VALUES (?, ?, 'General Merchandise', 'Primary standard inventory category')
      `).run(catId, tenantId);

      // Fetch created record details
      createdUser = db.prepare('SELECT id, tenant_id, name, email, role FROM users WHERE id = ?').get(adminUserId);
      createdTenant = db.prepare('SELECT id, name, slug, plan FROM tenants WHERE id = ?').get(tenantId);

      // Generate JWT Token for immediate seamless workspace session
      authToken = jwt.sign(
        {
          id: createdUser.id,
          tenant_id: createdUser.tenant_id,
          email: createdUser.email,
          name: createdUser.name,
          role: createdUser.role
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
    } else {
      // Existing tenant upgrade
      db.prepare('UPDATE tenants SET plan = ? WHERE id = ?').run(plan?.code || 'PRO', tenantId);
      createdTenant = db.prepare('SELECT id, name, slug, plan FROM tenants WHERE id = ?').get(tenantId);
    }

    // Create Subscription record
    const subId = `sub-${Date.now().toString(36)}`;
    db.prepare(`
      INSERT INTO subscriptions (
        id, tenant_id, plan_id, status, billing_cycle, current_period_start, current_period_end, last_payment_tx_ref
      ) VALUES (?, ?, ?, 'ACTIVE', ?, CURRENT_TIMESTAMP, ?, ?)
    `).run(
      subId,
      tenantId,
      payment.plan_id,
      meta.billingCycle || 'MONTHLY',
      periodEnd,
      tx_ref
    );

    // Update payment record to SUCCESS
    db.prepare(`
      UPDATE payments 
      SET status = 'SUCCESS',
          tenant_id = ?,
          chapa_reference = ?,
          paid_at = CURRENT_TIMESTAMP
      WHERE tx_ref = ?
    `).run(tenantId, chapaReference, tx_ref);

    // Record Audit Log
    db.prepare(`
      INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, details_json)
      VALUES (?, ?, ?, 'PAYMENT_COMPLETED', 'SUBSCRIPTION', ?, ?)
    `).run(
      uuidv4(),
      tenantId,
      adminUserId,
      subId,
      JSON.stringify({
        gateway: 'CHAPA',
        tx_ref,
        amount: payment.amount,
        currency: payment.currency,
        plan_code: plan?.code,
        channel: payment.payment_channel
      })
    );

    res.json({
      success: true,
      status: 'SUCCESS',
      tx_ref,
      chapa_reference: chapaReference,
      amount: payment.amount,
      currency: payment.currency,
      paid_at: new Date().toISOString(),
      tenant: createdTenant,
      user: createdUser,
      token: authToken,
      plan: {
        id: plan?.id,
        name: plan?.name,
        code: plan?.code,
        period_end: periodEnd
      },
      message: 'Payment verified and tenant subscription activated successfully!'
    });
  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ error: err.message || 'Payment verification failed' });
  }
});

// 5. Free 14-day Trial Instant Tenant Onboarding
router.post('/free-trial', async (req, res) => {
  try {
    const { tenantName, adminName, adminEmail, adminPassword = 'Password123!' } = req.body;

    if (!tenantName || !adminEmail || !adminName) {
      return res.status(400).json({ error: 'Please provide organization name, admin name, and email' });
    }

    const tenantId = `tenant-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const baseSlug = tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'company';
    const tenantSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 5)}`;

    const plan = db.prepare("SELECT * FROM subscription_plans WHERE code = 'PRO'").get() ||
                 db.prepare("SELECT * FROM subscription_plans LIMIT 1").get();

    // 1. Create Tenant
    db.prepare(`
      INSERT INTO tenants (id, name, slug, plan, settings_json)
      VALUES (?, ?, ?, 'PRO', ?)
    `).run(
      tenantId,
      tenantName,
      tenantSlug,
      JSON.stringify({ currency: 'ETB', country: 'ET', is_trial: true })
    );

    // 2. Create Admin User
    const adminUserId = `user-${Date.now().toString(36)}`;
    const passwordHash = bcrypt.hashSync(adminPassword, 10);

    db.prepare(`
      INSERT INTO users (id, tenant_id, name, email, password_hash, role, status)
      VALUES (?, ?, ?, ?, ?, 'TENANT_ADMIN', 'ACTIVE')
    `).run(adminUserId, tenantId, adminName, adminEmail, passwordHash);

    // 3. Create Default Central Warehouse
    const whId = `wh-${Date.now().toString(36)}`;
    db.prepare(`
      INSERT INTO warehouses (id, tenant_id, name, code, city, country, capacity_sqm, manager_name)
      VALUES (?, ?, 'Central Distribution Hub', 'WH-HQ-01', 'Addis Ababa', 'Ethiopia', 4500, ?)
    `).run(whId, tenantId, adminName);

    // 4. Create Default Category & Sample Product
    const catId = uuidv4();
    db.prepare(`
      INSERT INTO categories (id, tenant_id, name, description)
      VALUES (?, ?, 'Standard Logistics', 'Default category for trial inventory')
    `).run(catId, tenantId);

    // 5. Create Subscription in TRIAL status for 14 days
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(`
      INSERT INTO subscriptions (
        id, tenant_id, plan_id, status, billing_cycle, current_period_start, current_period_end
      ) VALUES (?, ?, ?, 'TRIAL', 'MONTHLY', CURRENT_TIMESTAMP, ?)
    `).run(uuidv4(), tenantId, plan.id, trialEnd);

    const user = db.prepare('SELECT id, tenant_id, name, email, role FROM users WHERE id = ?').get(adminUserId);
    const tenant = db.prepare('SELECT id, name, slug, plan FROM tenants WHERE id = ?').get(tenantId);

    const token = jwt.sign(
      {
        id: user.id,
        tenant_id: user.tenant_id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user,
      tenant,
      trialEnd,
      message: '14-day Pro Free Trial activated successfully!'
    });
  } catch (err) {
    console.error('Free trial registration error:', err);
    res.status(500).json({ error: err.message || 'Free trial registration failed' });
  }
});

// 6. Chapa Webhook Listener
router.post('/chapa-webhook', (req, res) => {
  try {
    const event = req.body;
    console.log('[CHAPA WEBHOOK EVENT]', event);
    
    if (event?.tx_ref && event?.status === 'success') {
      db.prepare(`
        UPDATE payments 
        SET status = 'SUCCESS',
            paid_at = CURRENT_TIMESTAMP
        WHERE tx_ref = ?
      `).run(event.tx_ref);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing error' });
  }
});

export default router;
