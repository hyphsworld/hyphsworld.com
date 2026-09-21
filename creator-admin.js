(function () {
  'use strict';

  var client;
  var loading = false;

  function el(id) { return document.getElementById(id); }
  function status(value) { el('adminStatus').textContent = value; }
  function node(tag, text) { var item = document.createElement(tag); item.textContent = text; return item; }
  function setRetry(visible) { el('adminRetry').hidden = !visible; }

  function friendlyError(error) {
    var message = String(error && error.message || '');
    if (/permission|policy|row-level|42501|403/i.test(message)) return 'Owner clearance required. This area is protected.';
    return 'Could not connect to Owner Control. Check your connection and retry.';
  }

  async function load() {
    if (loading) return;
    loading = true;
    setRetry(false);
    el('adminPanel').hidden = true;
    status('Confirming owner clearance…');

    try {
      if (!window.HWAuth) throw new Error('Account service did not load.');
      client = await window.HWAuth.getClient();
      var authResult = await client.auth.getUser();
      if (authResult.error) throw authResult.error;
      if (!authResult.data || !authResult.data.user) {
        location.href = 'auth.html?next=creator-admin.html';
        return;
      }

      var queue = await client.from('creator_verification_requests')
        .select('id,requested_level,evidence_summary,status,created_at,creators(display_name)')
        .in('status', ['pending', 'in_review'])
        .order('created_at');
      if (queue.error) throw queue.error;

      el('adminPanel').hidden = false;
      status('OWNER VERIFIED • SERVER-AUDITED ACTIONS');
      renderQueue(queue.data || []);
      await Promise.all([loadApplications(), loadCreators(), loadAudit()]);
    } catch (error) {
      status(friendlyError(error));
      setRetry(!/permission|policy|row-level|42501|403/i.test(String(error && error.message || '')));
    } finally {
      loading = false;
    }
  }

  async function loadApplications() {
    var result = await client.from('creator_applications')
      .select('id,display_name,categories,city,bio,portfolio_url,contact_email,status,created_at')
      .in('status', ['pending', 'in_review', 'needs_info']).order('created_at');
    if (result.error) throw result.error;
    var box = el('applicationQueue');
    box.replaceChildren();
    (result.data || []).forEach(function (application) {
      var card = node('article', '');
      var link = node('a', 'Review public work ↗');
      link.href = application.portfolio_url; link.target = '_blank'; link.rel = 'noopener';
      card.append(
        node('strong', application.display_name + ' • ' + application.city),
        node('small', application.categories.join(' • ') + ' • ' + application.contact_email),
        node('p', application.bio), link
      );
      [['in_review','Start Review'],['needs_info','Request Info'],['approved','Approve'],['rejected','Reject']].forEach(function (action) {
        var button = node('button', action[1]); button.type = 'button';
        button.addEventListener('click', function () { decideApplication(application.id, action[0]); });
        card.append(button);
      });
      box.append(card);
    });
    if (!box.children.length) box.append(node('span', 'Application queue clear.'));
  }

  async function decideApplication(id, decision) {
    var notes = window.prompt('Private review note or applicant instructions:', '') || '';
    var result = await client.rpc('creator_admin_decide_application', { p_application_id: id, p_decision: decision, p_notes: notes });
    if (result.error) { status(friendlyError(result.error)); return; }
    status('Application marked ' + decision.replace('_', ' ') + '.');
    await loadApplications();
  }

  function renderQueue(rows) {
    var box = el('verificationQueue');
    box.replaceChildren();
    if (!rows.length) { box.append(node('span', 'Queue clear.')); return; }
    rows.forEach(function (row) {
      var card = node('article', '');
      card.append(node('strong', ((row.creators && row.creators.display_name) || 'Creator') + ' • ' + row.requested_level.toUpperCase()), node('small', row.evidence_summary));
      ['approved', 'rejected'].forEach(function (decision) {
        var button = node('button', decision === 'approved' ? 'Approve' : 'Reject');
        button.type = 'button';
        button.addEventListener('click', function () { decide(row.id, decision); });
        card.append(button);
      });
      box.append(card);
    });
  }

  async function decide(id, decision) {
    var notes = window.prompt('Private review note (optional):', '') || '';
    var result = await client.rpc('creator_admin_decide_verification', { p_request_id: id, p_decision: decision, p_notes: notes });
    if (result.error) { status(friendlyError(result.error)); return; }
    status('Verification ' + decision + ' and logged.');
    load();
  }

  async function loadCreators() {
    var result = await client.from('creators').select('id,display_name,owner_user_id').order('display_name');
    if (result.error) throw result.error;
    var select = el('adminCreator');
    var ownerSelect = el('ownerCreator');
    select.replaceChildren();
    ownerSelect.replaceChildren();
    (result.data || []).forEach(function (creator) {
      var option = node('option', creator.display_name);
      option.value = creator.id;
      select.append(option);
      var ownerOption = node('option', creator.display_name + (creator.owner_user_id ? ' • LOGIN LINKED' : ' • NOT LINKED'));
      ownerOption.value = creator.id;
      ownerOption.dataset.linked = creator.owner_user_id ? 'true' : 'false';
      ownerSelect.append(ownerOption);
    });
    renderOwnerState();
  }

  function renderOwnerState() {
    var option = el('ownerCreator').selectedOptions[0];
    var box = el('ownerAssignmentState');
    box.replaceChildren(node('span', option && option.dataset.linked === 'true' ? 'This Creator World already has a linked login. Submitting a different email requires confirmation.' : 'No creator login is linked yet.'));
  }

  async function loadAudit() {
    var result = await client.from('creator_audit_log').select('action,created_at,creators(display_name)').order('created_at', { ascending: false }).limit(30);
    if (result.error) throw result.error;
    var box = el('auditList');
    box.replaceChildren();
    (result.data || []).forEach(function (audit) {
      var card = node('article', '');
      card.append(node('strong', audit.action.replaceAll('_', ' ').toUpperCase()), node('small', ((audit.creators && audit.creators.display_name) || 'System') + ' • ' + new Date(audit.created_at).toLocaleString()));
      box.append(card);
    });
    if (!box.children.length) box.append(node('span', 'No audited actions yet.'));
  }

  el('entitlementForm').addEventListener('submit', async function (event) {
    event.preventDefault();
    var result = await client.rpc('creator_admin_set_entitlement', {
      p_creator_id: el('adminCreator').value,
      p_key: el('entitlementKey').value.trim(),
      p_status: el('entitlementStatus').value,
      p_source: el('entitlementSource').value,
      p_expires_at: null
    });
    if (result.error) { status(friendlyError(result.error)); return; }
    status('Creator tool access updated and logged.');
    el('entitlementKey').value = '';
    try { await loadAudit(); } catch (error) { status(friendlyError(error)); }
  });

  el('ownerCreator').addEventListener('change', renderOwnerState);
  el('ownerAssignmentForm').addEventListener('submit', async function (event) {
    event.preventDefault();
    var option = el('ownerCreator').selectedOptions[0];
    if (option && option.dataset.linked === 'true' && !window.confirm('Replace the current creator login with this HYPHSWORLD ID?')) return;
    var result = await client.rpc('creator_admin_assign_owner', {
      p_creator_id: el('ownerCreator').value,
      p_owner_email: el('ownerEmail').value.trim().toLowerCase()
    });
    if (result.error) { status(result.error.message || friendlyError(result.error)); return; }
    status('Creator login connected and audit logged.');
    el('ownerEmail').value = '';
    await Promise.all([loadCreators(), loadAudit()]);
  });

  el('adminRetry').addEventListener('click', load);
  window.addEventListener('load', load);
})();
