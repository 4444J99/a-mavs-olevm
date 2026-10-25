'use strict';

// Repository metadata only. Never execute a pull request's code with a write token.
const CLOSING_DIRECTIVE =
  /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*:?\s+(?:[\w.-]+\/[\w.-]+)?#\d+|\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*:?\s+https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/(?:issues|pull)\/\d+/gi;

function closingDirectives(text = '') {
  return [...text.matchAll(new RegExp(CLOSING_DIRECTIVE.source, 'gi'))].map(
    match => match[0]
  );
}

function localIssueNumbers(text, owner, repo) {
  const numbers = new Set();
  const expression =
    /https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/issues\/(\d+)|(?:([\w.-]+)\/([\w.-]+))?#(\d+)/g;
  for (const match of (text || '').matchAll(expression)) {
    const referenceOwner = match[1] || match[4];
    const referenceRepo = match[2] || match[5];
    if (
      referenceOwner &&
      (referenceOwner.toLowerCase() !== owner.toLowerCase() ||
        referenceRepo.toLowerCase() !== repo.toLowerCase())
    ) {
      continue;
    }
    numbers.add(Number(match[3] || match[6]));
  }
  return [...numbers];
}

function labelsForFiles(paths) {
  const rules = [
    ['javascript', /^js\//],
    ['design', /^css\/.*\.css$/],
    ['github_actions', /^\.github\/workflows\//],
    ['dependencies', /(?:^|\/)package[^/]*\.json$|^\.config\//],
    [
      'testing',
      /^(?:tests?|e2e)\/|(?:\.spec|\.test)\.[cm]?js$|(?:^|\/)playwright\.config\./,
    ],
    ['infrastructure', /^\.github\//],
    ['core', /\.html$/],
    ['documentation', /README|CHANGELOG|\.md$/],
    ['core', /^(?:labyrinth|akademia)\//],
  ];
  return [
    ...new Set(
      rules
        .filter(([, pattern]) => paths.some(path => pattern.test(path)))
        .map(([label]) => label)
    ),
  ];
}

function labelsForPullRequest(pr, paths) {
  const add = labelsForFiles(paths);
  const remove = [];
  if (pr.merged) {
    add.push('merged');
    remove.push('ready-for-review');
  } else if (pr.state === 'closed' || pr.draft) {
    remove.push('ready-for-review');
  } else {
    add.push('ready-for-review');
  }
  return { add, remove };
}

function pendingVerificationComment(pr, issue, defaultBranch) {
  return [
    `<!-- stewardship:pending-verification:pr-${pr.number}:issue-${issue.number} -->`,
    `Intention: preserve and complete the work recorded in issue #${issue.number}.`,
    `Current verdict: merged implementation; verification on \`${defaultBranch}\` remains pending.`,
    `Successor artifact: ${pr.html_url}. Merge commit: \`${pr.merge_commit_sha || 'not supplied by GitHub'}\`.`,
    'Next step: verify the issue finish line and applicable checks on the current default-branch commit, then record that evidence before deciding closure.',
    'No issue state was changed by this automation. A merge event alone does not establish completion.',
    'For an amalgamated family, reconcile every member and preserve unique work before any closure. A closure verdict must state the intention, evidence, successor, and why no unique work is lost.',
  ].join('\n\n');
}

async function recordMergedIntentions({ github, context }) {
  const pr = context.payload.pull_request;
  if (!pr || !pr.merged) return [];
  const defaultBranch = context.payload.repository.default_branch;
  const issueNumbers = localIssueNumbers(
    pr.body,
    context.repo.owner,
    context.repo.repo
  );
  const recorded = [];
  for (const issueNumber of issueNumbers) {
    let issue;
    try {
      ({ data: issue } = await github.rest.issues.get({
        ...context.repo,
        issue_number: issueNumber,
      }));
    } catch (error) {
      if (error.status === 404) continue;
      throw error;
    }
    // A numbered PR reference is not an issue intention.
    if (issue.pull_request || issue.state !== 'open') continue;
    const body = pendingVerificationComment(pr, issue, defaultBranch);
    const marker = body.split('\n')[0];
    const comments = await github.paginate(github.rest.issues.listComments, {
      ...context.repo,
      issue_number: issueNumber,
      per_page: 100,
    });
    if (comments.some(comment => comment.body?.includes(marker))) continue;
    await github.rest.issues.createComment({
      ...context.repo,
      issue_number: issueNumber,
      body,
    });
    recorded.push(issueNumber);
  }
  return recorded;
}

async function validatePullRequestLinkage({ github, context }) {
  const pr = context.payload.pull_request;
  const commits = await github.paginate(github.rest.pulls.listCommits, {
    ...context.repo,
    pull_number: pr.number,
    per_page: 100,
  });
  const findings = [];
  for (const [source, value] of [
    ['PR title', pr.title],
    ['PR body', pr.body],
  ]) {
    for (const directive of closingDirectives(value || '')) {
      findings.push({ source, directive });
    }
  }
  for (const commit of commits) {
    for (const directive of closingDirectives(commit.commit.message)) {
      findings.push({ source: commit.sha, directive });
    }
  }
  return findings;
}

module.exports = {
  closingDirectives,
  labelsForFiles,
  labelsForPullRequest,
  localIssueNumbers,
  pendingVerificationComment,
  recordMergedIntentions,
  validatePullRequestLinkage,
};
