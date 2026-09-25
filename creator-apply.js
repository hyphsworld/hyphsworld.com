(function () {
  'use strict';

  var client, user, existingApplication;
  var form = document.getElementById('creatorApplicationForm');
  var panel = document.getElementById('applicationPanel');
  var approvedPanel = document.getElementById('approvedPanel');
  var submit = document.getElementById('applicationSubmit');

  function el(id) { return document.getElementById(id); }
  function status(message) { el('applicationStatus').textContent = message; }
  function categories() {
    return el('applicationCategories').value.split(',').map(function (value) {
      return value.trim().toLowerCase();
    }).filter(Boolean).slice(0, 8);
  }
  function fill(application) {
    el('applicationName').value = application.display_name || '';
    el('applicationCategories').value = (application.categories || []).join(', ');
    el('applicationCity').value = application.city || '';
    el('applicationEmail').value = application.contact_email || user.email || '';
    el('applicationPortfolio').value = application.portfolio_url || '';
    el('applicationBio').value = application.bio || '';
  }
  function showApplicationForm(title, buttonLabel) {
    approvedPanel.hidden = true;
    panel.hidden = false;
    el('applicationTitle').textContent = title;
    submit.textContent = buttonLabel;
    submit.disabled = false;
  }

  async function load() {
    if (!window.HWAuth) throw new Error('Account service did not load.');
    client = await window.HWAuth.getClient();
    var auth = await client.auth.getUser();
    if (auth.error) throw auth.error;
    user = auth.data && auth.data.user;
    if (!user) {
      location.href = 'auth.html?next=' + encodeURIComponent('creator-apply.html');
      return;
    }

    var existing = await client.from('creator_applications')
      .select('id,display_name,categories,city,bio,portfolio_url,contact_email,status,review_notes,created_at')
      .eq('applicant_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing.error) throw existing.error;
    existingApplication = existing.data || null;

    if (!existingApplication) {
      el('applicationEmail').value = user.email || '';
      showApplicationForm('Apply for Creator World', 'Submit for Review');
      status('SIGNED IN • APPLICATION READY');
      return;
    }

    var state = String(existingApplication.status || 'pending');
    if (state === 'approved') {
      panel.hidden = true;
      approvedPanel.hidden = false;
      status('APPLICATION APPROVED • BUILD YOUR WORLD');
      return;
    }
    if (state === 'needs_info') {
      fill(existingApplication);
      showApplicationForm('Update your application', 'Send Back for Review');
      status('APPLICATION NEEDS INFO' + (existingApplication.review_notes ? ' • ' + existingApplication.review_notes : ''));
      return;
    }
    if (state === 'rejected') {
      fill(existingApplication);
      existingApplication = null;
      showApplicationForm('Apply again with stronger work', 'Submit New Application');
      status('APPLICATION NOT APPROVED' + (existing.data.review_notes ? ' • ' + existing.data.review_notes : ''));
      return;
    }

    panel.hidden = true;
    approvedPanel.hidden = true;
    status('APPLICATION ' + state.replace('_', ' ').toUpperCase() + (existingApplication.review_notes ? ' • ' + existingApplication.review_notes : ''));
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    submit.disabled = true;
    status(existingApplication ? 'Sending your update securely…' : 'Submitting securely…');

    var fields = {
      display_name: el('applicationName').value.trim(),
      categories: categories(),
      city: el('applicationCity').value.trim(),
      contact_email: el('applicationEmail').value.trim().toLowerCase(),
      portfolio_url: el('applicationPortfolio').value.trim(),
      bio: el('applicationBio').value.trim()
    };
    if (!fields.categories.length) {
      status('Add at least one creative category.');
      submit.disabled = false;
      return;
    }

    var result;
    if (existingApplication && existingApplication.status === 'needs_info') {
      fields.status = 'pending';
      fields.updated_at = new Date().toISOString();
      result = await client.from('creator_applications').update(fields).eq('id', existingApplication.id).eq('applicant_id', user.id);
    } else {
      fields.applicant_id = user.id;
      result = await client.from('creator_applications').insert(fields);
    }

    if (result.error) {
      status('Application not submitted: ' + result.error.message);
      submit.disabled = false;
      return;
    }
    form.reset();
    panel.hidden = true;
    status('APPLICATION RECEIVED • HUMAN REVIEW PENDING');
  });

  window.addEventListener('load', function () {
    load().catch(function (error) {
      status('Application unavailable: ' + (error.message || error));
    });
  });
})();
