(function () {
  const CACHE_KEY = 'gh_repo_cache';
  const LANG_COLORS = {
    'JavaScript': '#f1e05a',
    'TypeScript': '#3178c6',
    'Python':     '#3572A5',
    'Rust':       '#dea584',
    'Go':         '#00ADD8',
    'HTML':       '#e34c26',
    'CSS':        '#563d7c',
    'SCSS':       '#c6538c',
    'Shell':      '#89e051',
    'Bash':       '#89e051',
    'Dockerfile': '#384d54',
    'Nix':        '#7e7eff',
    'Lua':        '#000080',
    'C':          '#555555',
    'C++':        '#f34b7d',
    'C#':         '#178600',
    'Ruby':       '#701516',
    'Java':       '#b07219',
    'Swift':      '#F05138',
    'Kotlin':     '#A97BFF',
    'Zig':        '#ec915c',
    'Haskell':    '#5e5086',
    'Elixir':     '#6e4a7e',
    'Vue':        '#41b883',
    'Svelte':     '#ff3e00',
    'Astro':      '#ff5a03',
    'TOML':       '#9c4221',
    'YAML':       '#cb171e',
  };

  let cache = {};
  try { cache = JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}'); } catch (_) {}

  const saveCache = () => {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (_) {}
  };

  const parseRepoSlug = (repoUrl) => {
    const urlMatch = repoUrl.match(/github\.com\/([^/?#]+\/[^/?#]+)/);
    return urlMatch ? urlMatch[1].replace(/\.git$/, '') : null;
  };

  const fetchRepoData = (repoSlug) => {
    if (repoSlug in cache) return Promise.resolve(cache[repoSlug]);
    return Promise.all([
      fetch(`https://api.github.com/repos/${repoSlug}`).then(response => response.json()),
      fetch(`https://api.github.com/repos/${repoSlug}/languages`).then(response => response.json()),
    ]).then(([repoInfo, languageMap]) => {
      cache[repoSlug] = {
        stars:     typeof repoInfo.stargazers_count === 'number' ? repoInfo.stargazers_count : 0,
        languages: (languageMap && !languageMap.message) ? languageMap : {},
      };
      saveCache();
      return cache[repoSlug];
    }).catch(() => {
      cache[repoSlug] = null;
      saveCache();
      return null;
    });
  };

  const buildLangBar = (languages) => {
    const entries = Object.entries(languages).filter(([, byteCount]) => byteCount > 0);
    if (!entries.length) return null;

    const byteTotal     = entries.reduce((accumulator, [, byteCount]) => accumulator + byteCount, 0);
    const fragment      = document.createDocumentFragment();
    const trackElement  = document.createElement('div');
    const labelsElement = document.createElement('div');
    trackElement.className  = 'flex h-2 rounded-sm overflow-hidden gap-0.5';
    labelsElement.className = 'flex flex-wrap gap-x-4 gap-y-1.5 mt-2';

    for (const [languageName, byteCount] of entries) {
      const languageColor = LANG_COLORS[languageName] || '#8b949e';
      const percentage    = ((byteCount / byteTotal) * 100).toFixed(1);

      const languageSegment = document.createElement('span');
      languageSegment.style.flex       = String(byteCount);
      languageSegment.style.background = languageColor;
      languageSegment.style.minWidth   = '2px';
      languageSegment.title            = `${languageName} ${percentage}%`;
      trackElement.appendChild(languageSegment);

      const labelItem = document.createElement('span');
      labelItem.className = 'inline-flex items-center gap-1 text-xs';
      labelItem.innerHTML =
        `<span class="w-2.5 h-2.5 rounded-full shrink-0 inline-block" style="background:${languageColor}"></span>` +
        `<span class="text-zinc-600 dark:text-zinc-400">${languageName}</span>` +
        `<span class="text-zinc-400 dark:text-zinc-500">${percentage}%</span>`;
      labelsElement.appendChild(labelItem);
    }

    fragment.appendChild(trackElement);
    fragment.appendChild(labelsElement);
    return fragment;
  };

  const formatStarCount = (starCount) =>
    starCount >= 1000 ? `${(starCount / 1000).toFixed(1)}k` : String(starCount);

  const initElement = (repoElement) => {
    const repoSlug = parseRepoSlug(repoElement.dataset.githubRepo);
    if (!repoSlug) return;

    fetchRepoData(repoSlug).then((repoData) => {
      if (!repoData) return;

      const langBarElement = repoElement.querySelector('.gh-lang-bar');
      if (langBarElement && repoData.languages) {
        const langBarFragment = buildLangBar(repoData.languages);
        if (langBarFragment) langBarElement.appendChild(langBarFragment);
      }

      const starCountElement = repoElement.querySelector('.gh-star-count');
      if (starCountElement) {
        starCountElement.textContent = formatStarCount(repoData.stars);
        repoElement.querySelector('[data-star-btn]')?.removeAttribute('hidden');
      }
    });
  };

  const init = () => document.querySelectorAll('[data-github-repo]').forEach(initElement);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
