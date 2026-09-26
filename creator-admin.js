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
      await Promise.all([loadApplications(), loadCreators(), loadAudit(), loadCreationReviews()]);
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

  async function loadCreationReviews() {
    var box = el('creationReviewQueue'), publishReady = true;
    var columns = 'id,creator_id,title,creation_kind,media_type,mime_type,file_size,storage_path,status,public_path,published_at,created_at,creators(display_name)';
    var result = await client.from('creator_media_uploads').select(columns).in('status', ['ready_for_review', 'approved', 'published']).order('created_at');
    if (result.error && /public_path|published_at/i.test(result.error.message || '')) {
      publishReady = false;
      result = await client.from('creator_media_uploads').select('id,creator_id,title,creation_kind,media_type,mime_type,file_size,storage_path,status,created_at,creators(display_name)').in('status', ['ready_for_review', 'approved']).order('created_at');
    }
    box.replaceChildren();
    if (result.error) { box.append(node('span', 'Creation review is temporarily unavailable.')); return; }
    (result.data || []).forEach(function (creation) {
      var card = node('article', '');
      var creatorName = creation.creators && creation.creators.display_name || 'Creator';
      var actions = node('div', ''); actions.className = 'upload-actions';
      if (creation.status !== 'published') {
        var preview = node('button', 'Preview'); preview.type = 'button'; preview.addEventListener('click', function () { previewCreation(creation.storage_path); }); actions.appendChild(preview);
      }
      if (creation.status === 'ready_for_review') {
        var approve = node('button', 'Approve'); approve.type = 'button'; approve.addEventListener('click', function () { decideCreation(creation.id, 'approved'); });
        var changes = node('button', 'Request Changes'); changes.type = 'button'; changes.className = 'danger'; changes.addEventListener('click', function () { decideCreation(creation.id, 'changes_requested'); });
        actions.append(approve, changes);
      } else if (creation.status === 'approved') {
        var publish = node('button', publishReady ? 'PUBLISH TO WORLD' : 'PUBLISH SETUP PENDING');
        publish.type = 'button'; publish.className = 'publish-world'; publish.disabled = !publishReady;
        if (publishReady) publish.addEventListener('click', function () { publishCreation(creation); });
        actions.appendChild(publish);
      } else if (creation.status === 'published' && creation.public_path) {
        var live = node('a', 'VIEW WORLD DROP ↗'); live.href = worldDropUrl(creation.id); live.target = '_blank'; live.rel = 'noopener'; live.className = 'panel-link'; actions.appendChild(live);
        checkPublishedFile(creation, actions);
      }
      var stateLabel = creation.status === 'published' ? 'LIVE IN WORLD' : creation.status === 'approved' ? 'OWNER APPROVED' : 'PRIVATE REVIEW';
      card.append(node('strong', creation.title), node('small', creatorName + ' • ' + String(creation.creation_kind || creation.media_type).replaceAll('_', ' ').toUpperCase() + ' • ' + stateLabel), actions);
      box.append(card);
    });
    if (!box.children.length) box.append(node('span', 'Creation review queue clear.'));
  }

  async function previewCreation(path) {
    var result = await client.storage.from('creator-world-uploads').createSignedUrl(path, 600);
    if (result.error) { status(friendlyError(result.error)); return; }
    window.open(result.data.signedUrl, '_blank', 'noopener');
  }

  function publicFileName(creation) {
    var source = String(creation.storage_path || '').split('/').pop() || 'creation';
    return source.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-140);
  }

  function worldDropUrl(id) {
    return 'creator-drop.html?id=' + encodeURIComponent(id);
  }

  function publicFileUrl(path) {
    var result = client.storage.from('creator-world-public').getPublicUrl(path);
    return result && result.data && result.data.publicUrl;
  }

  async function publicFileExists(path) {
    var url = publicFileUrl(path);
    if (!url) return false;
    try {
      var response = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async function copyPrivateSourceToPublic(creation, publicPath) {
    var signed = await client.storage.from('creator-world-uploads').createSignedUrl(creation.storage_path, 300);
    if (signed.error) throw new Error('Private source unavailable: ' + signed.error.message);
    var response = await fetch(signed.data.signedUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not prepare the approved creation.');
    var blob = await response.blob();
    var published = await client.storage.from('creator-world-public').upload(publicPath, blob, {
      cacheControl: '3600',
      upsert: true,
      contentType: creation.mime_type || blob.type
    });
    if (published.error) throw published.error;
    if (!(await publicFileExists(publicPath))) throw new Error('The live file could not be verified after upload.');
  }

  async function restorePublishedCreation(creation, button) {
    if (!window.confirm('Restore the public file for “' + creation.title + '” from its protected original?')) return;
    button.disabled = true;
    status('Restoring live World Drop…');
    try {
      await copyPrivateSourceToPublic(creation, creation.public_path);
      button.remove();
      status('RESTORED • “' + creation.title + '” is live inside HYPHSWORLD.');
    } catch (error) {
      button.disabled = false;
      status('Restore failed safely: ' + (error.message || error));
    }
  }

  async function checkPublishedFile(creation, actions) {
    if (await publicFileExists(creation.public_path)) return;
    var restore = node('button', 'RESTORE LIVE FILE');
    restore.type = 'button';
    restore.className = 'publish-world';
    restore.addEventListener('click', function () { restorePublishedCreation(creation, restore); });
    actions.appendChild(restore);
  }

  async function publishCreation(creation) {
    if (!window.confirm('Publish “' + creation.title + '” live inside this Creator World?')) return;
    status('Publishing to Creator World…');
    try {
      var publicPath = creation.creator_id + '/' + creation.id + '/' + publicFileName(creation);
      await copyPrivateSourceToPublic(creation, publicPath);
      var finalized = await client.rpc('creator_admin_publish_creation', { p_creation_id: creation.id, p_public_path: publicPath });
      if (finalized.error) {
        await client.storage.from('creator-world-public').remove([publicPath]);
        throw finalized.error;
      }
      status('LIVE • Published to ' + ((creation.creators && creation.creators.display_name) || 'Creator World') + '.');
      await Promise.all([loadCreationReviews(), loadAudit()]);
    } catch (error) {
      status('Publish failed safely: ' + (error.message || error));
    }
  }

  async function decideCreation(id, decision) {
    var promptText = decision === 'approved' ? 'Private owner note (optional):' : 'Tell the creator what should change:';
    var notes = window.prompt(promptText, '');
    if (notes === null) return;
    if (decision === 'changes_requested' && !notes.trim()) { status('A change request needs clear owner instructions.'); return; }
    var result = await client.rpc('creator_admin_decide_creation', { p_creation_id: id, p_decision: decision, p_notes: notes });
    if (result.error) { status(friendlyError(result.error)); return; }
    status(decision === 'approved' ? 'Creation owner-approved and audit logged.' : 'Creator changes requested and audit logged.');
    await Promise.all([loadCreationReviews(), loadAudit()]);
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
