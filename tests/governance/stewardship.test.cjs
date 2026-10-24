'use strict';

const test = global.test || require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  closingDirectives,
  labelsForFiles,
  labelsForPullRequest,
  localIssueNumbers,
  recordMergedIntentions,
  validatePullRequestLinkage,
} = require('../../scripts/stewardship.cjs');

function fixture({
  body = 'Refs #8',
  merged = true,
  issues = {},
  comments = [],
} = {}) {
  const writes = [];
  const context = {
    repo: { owner: 'organvm-ii-poiesis', repo: 'a-mavs-olevm' },
    payload: {
      repository: { default_branch: 'main' },
      pull_request: {
        number: 42,
        title: 'Preserve intentions',
        body,
        merged,
        merge_commit_sha: 'a'.repeat(40),
        html_url: 'https://github.com/organvm-ii-poiesis/a-mavs-olevm/pull/42',
      },
    },
  };
  const github = {
    rest: {
      issues: {
        get: async ({ issue_number }) => ({
          data: issues[issue_number] || { number: issue_number, state: 'open' },
        }),
        listComments: () => {},
        createComment: async parameters => {
          writes.push(['comment', parameters]);
        },
        update: async parameters => {
          writes.push(['state', parameters]);
        },
      },
      pulls: { listCommits: () => {} },
    },
    paginate: async (method, parameters) => {
      assert.equal(parameters.per_page, 100);
      if (method === github.rest.issues.listComments) return comments;
      throw new Error('Unexpected pagination surface');
    },
  };
  return { github, context, writes };
}

test('merged implementation records a verdict and successor without closing the issue', async () => {
  const state = fixture();
  assert.deepEqual(await recordMergedIntentions(state), [8]);
  assert.equal(state.writes.length, 1);
  const [operation, parameters] = state.writes[0];
  assert.equal(operation, 'comment');
  assert.equal(parameters.issue_number, 8);
  assert.match(parameters.body, /Intention:/);
  assert.match(parameters.body, /Current verdict:/);
  assert.match(parameters.body, /Successor artifact: https:\/\/github\.com\//);
  assert.match(parameters.body, /Next step: verify/);
  assert.match(parameters.body, /`main` remains pending/);
  assert.match(parameters.body, /why no unique work is lost/);
});

test('an unmerged close never records completion or changes issue state', async () => {
  const state = fixture({ merged: false });
  assert.deepEqual(await recordMergedIntentions(state), []);
  assert.deepEqual(state.writes, []);
});

test('PR references, closed issues, and foreign repository references stay untouched', async () => {
  const state = fixture({
    body: 'Refs #7, #8, other/repo#9, https://github.com/other/repo/issues/10',
    issues: {
      7: { number: 7, state: 'closed' },
      8: { number: 8, state: 'open', pull_request: {} },
    },
  });
  assert.deepEqual(await recordMergedIntentions(state), []);
  assert.deepEqual(state.writes, []);
});

test('duplicate deliveries find receipts beyond the first comment page', async () => {
  const comments = Array.from({ length: 150 }, () => ({
    body: 'Earlier discussion',
  }));
  comments.push({
    body: '<!-- stewardship:pending-verification:pr-42:issue-8 -->',
  });
  const state = fixture({ comments });
  assert.deepEqual(await recordMergedIntentions(state), []);
  assert.deepEqual(state.writes, []);
});

test('a missing issue is skipped but API authorization errors fail visibly', async () => {
  const missing = fixture();
  missing.github.rest.issues.get = async () => {
    throw Object.assign(new Error('missing'), { status: 404 });
  };
  assert.deepEqual(await recordMergedIntentions(missing), []);
  const denied = fixture();
  denied.github.rest.issues.get = async () => {
    throw Object.assign(new Error('denied'), { status: 403 });
  };
  await assert.rejects(recordMergedIntentions(denied), /denied/);
  assert.deepEqual(denied.writes, []);
});

test('local issue references deduplicate and resolve qualified links case-insensitively', () => {
  assert.deepEqual(
    localIssueNumbers(
      'Refs #8; #8; ORGANVM-II-POIESIS/A-MAVS-OLEVM#9; https://github.com/organvm-ii-poiesis/a-mavs-olevm/issues/10; unrelated/repo#11',
      'organvm-ii-poiesis',
      'a-mavs-olevm'
    ),
    [8, 9, 10]
  );
});

test('native GitHub closing directives are identified across verb forms and reference types', () => {
  for (const verb of [
    'close',
    'closes',
    'closed',
    'fix',
    'fixes',
    'fixed',
    'resolve',
    'resolves',
    'resolved',
  ]) {
    for (const reference of [
      '#8',
      'owner/repo#8',
      'https://github.com/owner/repo/issues/8',
    ]) {
      assert.equal(closingDirectives(`${verb} ${reference}`).length, 1);
    }
  }
  assert.deepEqual(
    closingDirectives(
      'Refs #8. This fixes the audio behavior. Closure waits for verification.'
    ),
    []
  );
});

test('guard checks the PR title, body and paginated commit messages', async () => {
  const state = fixture({ body: 'Closes #8' });
  state.context.payload.pull_request.title = 'Fixes #9';
  state.github.paginate = async (method, parameters) => {
    assert.equal(method, state.github.rest.pulls.listCommits);
    assert.equal(parameters.per_page, 100);
    return [
      {
        sha: 'b'.repeat(40),
        commit: { message: 'Repair navigation\n\nResolves #10' },
      },
    ];
  };
  assert.deepEqual(
    (await validatePullRequestLinkage(state)).map(finding => finding.source),
    ['PR title', 'PR body', 'b'.repeat(40)]
  );
});

test('testing labels recognize spec files outside tests and do not label every file', () => {
  assert.deepEqual(labelsForFiles(['notes/example.txt']), []);
  assert.ok(labelsForFiles(['src/player.spec.js']).includes('testing'));
  assert.ok(labelsForFiles(['src/player.test.cjs']).includes('testing'));
  assert.ok(
    labelsForFiles(['tests/governance/stewardship.test.cjs']).includes(
      'testing'
    )
  );
  assert.deepEqual(labelsForFiles(['js/main.js', 'css/styles.css']), [
    'javascript',
    'design',
  ]);
});

test('real source paths and PR lifecycle states use only the repository label inventory', () => {
  // Independent observed repository metadata, not a second copy of the factory.
  const inventory = require('./known-labels.json');
  const known = new Set(inventory.labels);
  const paths = [
    'css/styles.css',
    '.github/workflows/project-automation.yml',
    'index.html',
    'akademia/config.js',
    'js/main.js',
    'package-lock.json',
    'tests/governance/stewardship.test.cjs',
    'docs/REPOSITORY_STEWARDSHIP.md',
  ];
  for (const pr of [
    { state: 'open', draft: true, merged: false },
    { state: 'open', draft: false, merged: false },
    { state: 'closed', draft: false, merged: false },
    { state: 'closed', draft: false, merged: true },
  ]) {
    const labels = labelsForPullRequest(pr, paths);
    for (const name of [...labels.add, ...labels.remove]) {
      assert.ok(known.has(name), `Unknown repository label: ${name}`);
    }
    assert.equal(new Set(labels.add).size, labels.add.length);
    assert.equal(labels.add.includes('merged'), pr.merged);
    assert.equal(
      labels.add.includes('ready-for-review'),
      pr.state === 'open' && !pr.draft
    );
    assert.equal(
      labels.remove.includes('ready-for-review'),
      pr.merged || pr.state === 'closed' || pr.draft
    );
  }
});

test('metadata workflow uses trusted default code and has no automatic issue close operation', () => {
  const root = path.resolve(__dirname, '../..');
  const workflow = fs.readFileSync(
    path.join(root, '.github/workflows/project-automation.yml'),
    'utf8'
  );
  const helper = fs.readFileSync(
    path.join(root, 'scripts/stewardship.cjs'),
    'utf8'
  );
  const protocol = fs.readFileSync(
    path.join(root, '.github/workflows/stewardship.yml'),
    'utf8'
  );
  assert.match(workflow, /pull_request_target:/);
  assert.match(workflow, /await recordMergedIntentions\(/);
  assert.match(workflow, /await validatePullRequestLinkage\(/);
  assert.match(workflow, /github\.paginate\(github\.rest\.pulls\.listFiles/);
  assert.equal(
    (
      workflow.match(
        /ref: \$\{\{ github\.event\.repository\.default_branch \}\}/g
      ) || []
    ).length,
    3
  );
  assert.doesNotMatch(
    workflow,
    /pull_request\.head|head\.sha|issues\.update\(/
  );
  assert.doesNotMatch(helper, /issues\.update\(/);
  assert.match(protocol, /node --test tests\/governance\/\*\.test\.cjs/);
});
