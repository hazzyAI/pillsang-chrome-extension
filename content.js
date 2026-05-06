// 필상 피싱 탐지기 - Content Script
// 페이지 로드 시 URL + HTML 특성 추출 후 background로 전송

(function () {
  'use strict';

  const FEATURE_ORDER = [
    'url_entropy','alpha_ratio','uppercase_ratio','scheme_type','is_https','scheme_length',
    'hostname_length','number_of_dots','number_of_subdomains','average_subdomain_length',
    'max_subdomain_length','tld_length','tld_entropy','domain_token_count','domain_token_entropy_max',
    'path_length','path_depth','max_path_segment_length','path_digit_ratio','path_special_char_ratio',
    'has_query','number_of_query_parameters','average_param_key_length','query_key_entropy_mean',
    'query_value_entropy_mean','has_fragment','fragment_entropy','count_hash',
    'hostname_vs_path_entropy_gap','max_component_entropy','mean_component_entropy',
    'num_tags','num_unique_tags','avg_word_length','text_entropy','keyword_entropy',
    'num_links','num_internal_links','avg_link_length','link_entropy_mean',
    'avg_image_alt_length','num_inline_scripts','script_entropy_mean',
    'num_forms','num_input_fields','avg_input_name_length','num_textareas','num_selects',
    'num_meta_tags','meta_charset_present','meta_viewport_present','num_style_tags',
    'avg_style_length','num_external_css','num_external_fonts',
    'total_num_tags','avg_entropy_components',
    'ratio_alpha_chars','ratio_whitespace_chars','ratio_special_chars','ratio_non_ascii_chars',
    'html_char_entropy','html_line_entropy_mean','total_tag_count','avg_tag_frequency',
    'tag_entropy','total_attribute_count','attribute_name_entropy',
    'avg_attribute_name_length','avg_attribute_value_length',
    'minified_score','num_base64_like_strings','indent_consistency_score',
    'avg_branching_factor','branching_factor_std','leaf_node_ratio',
    'repeated_subtree_ratio','hidden_input_ratio','image_link_ratio','mixed_content_hint'
  ];

  // ─── 유틸 ────────────────────────────────────────────────────────────────
  function shannonEntropy(s) {
    if (!s || s.length === 0) return 0.0;
    const freq = Object.create(null);
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      freq[c] = (freq[c] || 0) + 1;
    }
    let entropy = 0.0;
    const n = s.length;
    for (const key in freq) {
      const p = freq[key] / n;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  function countMatches(s, re) {
    const m = s.match(re);
    return m ? m.length : 0;
  }

  function mean(arr) {
    if (arr.length === 0) return 0.0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function stddev(arr, avg) {
    if (arr.length < 2) return 0.0;
    const m = avg !== undefined ? avg : mean(arr);
    return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
  }

  function isExternal(href, host) {
    if (!href || !host) return false;
    try {
      const u = new URL(href, window.location.href);
      if (!u.hostname) return false;
      const d = u.hostname.replace(/^www\./, '');
      const h = host.replace(/^www\./, '');
      return d !== h;
    } catch { return false; }
  }

  // ─── URL 특성 추출 ───────────────────────────────────────────────────────
  function extractUrlFeatures(url) {
    const f = Object.create(null);
    if (!url) url = '';

    let scheme = '', netloc = '', hostname = '', path = '', query = '', fragment = '';
    try {
      const p = new URL(url);
      scheme = p.protocol.replace(':', '');
      netloc = p.host;
      hostname = p.hostname;
      path = p.pathname;
      query = p.search ? p.search.slice(1) : '';
      fragment = p.hash ? p.hash.slice(1) : '';
    } catch {}

    const n = url.length;

    // Global
    f.total_url_length = n;
    f.url_entropy = shannonEntropy(url);
    f.digit_ratio = n ? countMatches(url, /[0-9]/g) / n : 0;
    f.alpha_ratio = n ? countMatches(url, /[A-Za-z]/g) / n : 0;
    f.non_alphanumeric_ratio = n ? countMatches(url, /[^A-Za-z0-9]/g) / n : 0;
    f.uppercase_ratio = n ? countMatches(url, /[A-Z]/g) / n : 0;
    f.lowercase_ratio = n ? countMatches(url, /[a-z]/g) / n : 0;

    // Scheme
    f.scheme_type = scheme === 'http' ? 0 : scheme === 'https' ? 1 : 2;
    f.is_https = scheme === 'https' ? 1 : 0;
    f.scheme_length = scheme.length;
    f.multiple_scheme_indicator = countMatches(url, /:\/\//g) > 1 ? 1 : 0;

    // Userinfo
    const atPos = netloc.indexOf('@');
    const userinfo = atPos >= 0 ? netloc.slice(0, atPos) : '';
    f.has_userinfo = atPos >= 0 ? 1 : 0;
    f.userinfo_length = userinfo.length;
    f.count_at_symbol = countMatches(url, /@/g);
    f.userinfo_entropy = shannonEntropy(userinfo);

    // Host
    f.hostname_length = hostname.length;
    f.number_of_dots = countMatches(hostname, /\./g);
    const tokens = hostname.split('.').filter(t => t.length > 0);
    const nt = tokens.length;
    f.number_of_subdomains = nt >= 2 ? Math.max(nt - 2, 0) : 0;
    const tLens = tokens.map(t => t.length);
    f.average_subdomain_length = mean(tLens);
    f.max_subdomain_length = tLens.length ? Math.max(...tLens) : 0;
    f.is_ip_address = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.test(hostname) ? 1 : 0;
    f.ip_version = f.is_ip_address ? 4 : 0;
    f.is_hex_encoded_ip = /0x[0-9a-fA-F]+/.test(hostname) ? 1 : 0;
    f.is_decimal_ip = /^\d+$/.test(hostname) ? 1 : 0;
    const tld = tokens.length ? tokens[tokens.length - 1] : '';
    f.tld_length = tld.length;
    f.tld_entropy = shannonEntropy(tld);
    f.domain_token_count = nt;
    const tEntropies = tokens.map(t => shannonEntropy(t));
    f.domain_token_entropy_mean = mean(tEntropies);
    f.domain_token_entropy_max = tEntropies.length ? Math.max(...tEntropies) : 0;

    // Path
    f.path_length = path.length;
    const segs = path.split('/').filter(s => s.length > 0);
    f.path_depth = segs.length;
    const sLens = segs.map(s => s.length);
    f.average_path_segment_length = mean(sLens);
    f.max_path_segment_length = sLens.length ? Math.max(...sLens) : 0;
    f.empty_path_segment_count = Math.max(0, countMatches(path, /\/\//g));
    f.path_digit_ratio = path.length ? countMatches(path, /[0-9]/g) / path.length : 0;
    f.path_special_char_ratio = path.length ? countMatches(path, /[^A-Za-z0-9/]/g) / path.length : 0;
    f.path_encoded_char_ratio = path.length ? countMatches(path, /%[0-9a-fA-F]{2}/g) / path.length : 0;
    f.directory_traversal_count = countMatches(path, /\.\.\//g);

    // Query
    f.has_query = query ? 1 : 0;
    f.query_length = query.length;
    const params = Object.create(null);
    if (query) {
      for (const part of query.split('&')) {
        const eqIdx = part.indexOf('=');
        const k = eqIdx >= 0 ? part.slice(0, eqIdx) : part;
        const v = eqIdx >= 0 ? part.slice(eqIdx + 1) : '';
        if (k) { if (!params[k]) params[k] = []; params[k].push(v); }
      }
    }
    const pKeys = Object.keys(params);
    f.number_of_query_parameters = pKeys.length;
    if (pKeys.length > 0) {
      f.average_param_key_length = mean(pKeys.map(k => k.length));
      const allVals = pKeys.flatMap(k => params[k]);
      f.average_param_value_length = mean(allVals.map(v => v.length));
      f.max_param_value_length = allVals.length ? Math.max(...allVals.map(v => v.length)) : 0;
      f.query_key_entropy_mean = mean(pKeys.map(k => shannonEntropy(k)));
      f.query_value_entropy_mean = allVals.length ? mean(allVals.map(v => shannonEntropy(v))) : 0;
      const totalKeys = pKeys.reduce((s, k) => s + params[k].length, 0);
      f.duplicate_query_key_count = Math.max(0, totalKeys - pKeys.length);
      f.base64_like_value_count = allVals.filter(v => /[A-Za-z0-9+/=]{20,}/.test(v)).length;
    } else {
      f.average_param_key_length = 0; f.average_param_value_length = 0;
      f.max_param_value_length = 0; f.query_key_entropy_mean = 0;
      f.query_value_entropy_mean = 0; f.duplicate_query_key_count = 0;
      f.base64_like_value_count = 0;
    }

    // Fragment
    f.has_fragment = fragment ? 1 : 0;
    f.fragment_length = fragment.length;
    f.fragment_entropy = shannonEntropy(fragment);
    f.fragment_contains_url = (fragment.includes('http')) ? 1 : 0;

    // Special chars
    f.count_question_mark = countMatches(url, /\?/g);
    f.count_equal_sign = countMatches(url, /=/g);
    f.count_ampersand = countMatches(url, /&/g);
    f.count_percent = countMatches(url, /%/g);
    f.count_hash = countMatches(url, /#/g);
    f.count_dash = countMatches(url, /-/g);
    f.count_plus = countMatches(url, /\+/g);
    f.count_colon = countMatches(url, /:/g);

    // Cross-component entropy
    const eHost = shannonEntropy(hostname);
    const ePath = shannonEntropy(path);
    const eQuery = shannonEntropy(query);
    f.hostname_vs_path_entropy_gap = Math.abs(eHost - ePath);
    f.path_vs_query_entropy_gap = Math.abs(ePath - eQuery);
    f.max_component_entropy = Math.max(eHost, ePath, eQuery);
    const mE = (eHost + ePath + eQuery) / 3;
    f.mean_component_entropy = mE;
    f.component_entropy_variance = ((eHost-mE)**2 + (ePath-mE)**2 + (eQuery-mE)**2) / 3;

    return f;
  }

  // ─── HTML 특성 추출 (DOM 직접 접근) ──────────────────────────────────────
  function extractHtmlFeatures(hostname) {
    const f = Object.create(null);
    const doc = document;
    const host = hostname;

    // Raw HTML (대용량 방지를 위해 500KB 제한)
    let html = '';
    try { html = doc.documentElement.outerHTML || ''; } catch {}
    const HTML_LIMIT = 500000;
    const htmlSample = html.length > HTML_LIMIT ? html.slice(0, HTML_LIMIT) : html;

    // 모든 태그
    const allTags = [...doc.querySelectorAll('*')];
    const numTags = allTags.length;

    // ── Structure ──
    f.num_tags = numTags;
    f.num_unique_tags = new Set(allTags.map(t => t.tagName.toLowerCase())).size;

    // 최대 중첩 깊이 (iterative BFS)
    let maxDepthVal = 0;
    const depthMap = new Map();
    const queue = [[doc.documentElement, 0]];
    while (queue.length > 0) {
      const [el, d] = queue.shift();
      depthMap.set(el, d);
      if (d > maxDepthVal) maxDepthVal = d;
      for (const child of el.children) queue.push([child, d + 1]);
    }
    f.num_nested_tags = maxDepthVal;

    // 평균 깊이
    if (numTags > 0) {
      let depthSum = 0;
      for (const t of allTags) {
        let d = 0, p = t.parentElement;
        while (p) { d++; p = p.parentElement; }
        depthSum += d;
      }
      f.avg_nesting_depth = depthSum / numTags;
    } else { f.avg_nesting_depth = 0; }

    const SC = new Set(['img','br','hr','input','meta','link','area','base','col','embed','source','track','wbr','param','keygen']);
    f.num_self_closing_tags = allTags.filter(t => SC.has(t.tagName.toLowerCase())).length;

    // Comments
    let commentCount = 0;
    try {
      const w = document.createTreeWalker(doc.documentElement, NodeFilter.SHOW_COMMENT);
      while (w.nextNode()) commentCount++;
    } catch {}
    f.num_comments = commentCount;

    // ── Text ──
    const bodyText = doc.body ? (doc.body.innerText || doc.body.textContent || '') : '';
    const tokens = bodyText.split(/\s+/).filter(t => t.length > 0);
    f.text_length = bodyText.length;
    f.num_words = tokens.length;
    f.avg_word_length = tokens.length ? mean(tokens.map(t => t.length)) : 0;
    f.text_entropy = shannonEntropy(bodyText.slice(0, 50000)); // 엔트로피는 샘플로
    f.num_uppercase_words = tokens.filter(w => w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w)).length;
    f.num_digits = countMatches(bodyText, /\d/g);
    f.digit_ratio = bodyText.length ? f.num_digits / bodyText.length : 0;
    f.num_special_chars = countMatches(bodyText, /[^a-zA-Z0-9\s]/g);
    f.num_unique_words = new Set(tokens).size;
    if (tokens.length > 0) {
      const wc = Object.create(null);
      tokens.forEach(w => wc[w] = (wc[w] || 0) + 1);
      const n = tokens.length;
      f.keyword_entropy = -Object.values(wc).reduce((s, c) => s + (c/n) * Math.log2(c/n), 0);
    } else { f.keyword_entropy = 0; }

    // ── Links ──
    const anchors = [...doc.querySelectorAll('a')];
    f.num_links = anchors.length;
    let numExtLinks = 0, numIntLinks = 0, numLinkTextEmpty = 0, numMailto = 0, numJsLinks = 0;
    const linkLens = [], linkEnts = [];
    for (const a of anchors) {
      const href = a.getAttribute('href') || '';
      if (href.startsWith('mailto:')) { numMailto++; continue; }
      if (href.startsWith('javascript:')) { numJsLinks++; continue; }
      if (href && isExternal(href, host)) numExtLinks++;
      else numIntLinks++;
      if (href) { linkLens.push(href.length); linkEnts.push(shannonEntropy(href)); }
      if (!a.textContent.trim()) numLinkTextEmpty++;
    }
    f.num_external_links = numExtLinks;
    f.num_internal_links = numIntLinks;
    f.num_link_text_empty = numLinkTextEmpty;
    f.avg_link_length = mean(linkLens);
    f.link_entropy_mean = mean(linkEnts);
    f.num_mailto_links = numMailto;
    f.num_javascript_links = numJsLinks;

    // ── Media ──
    const imgs = [...doc.querySelectorAll('img')];
    f.num_img_tags = imgs.length;
    let numExtImgs = 0, numB64Imgs = 0, numMissingAlt = 0;
    const altLens = [];
    for (const img of imgs) {
      const src = img.getAttribute('src') || '';
      if (src && isExternal(src, host)) numExtImgs++;
      if (src.slice(0, 11).toLowerCase() === 'data:image/') numB64Imgs++;
      const alt = img.getAttribute('alt');
      if (alt !== null && alt !== undefined) altLens.push(alt.length);
      else numMissingAlt++;
    }
    f.num_external_images = numExtImgs;
    f.num_base64_images = numB64Imgs;
    f.avg_image_alt_length = mean(altLens);
    f.num_img_missing_alt = numMissingAlt;
    f.num_video_tags = doc.querySelectorAll('video').length;
    f.num_audio_tags = doc.querySelectorAll('audio').length;
    const MEDIA_KW = ['youtube','vimeo','dailymotion','video','audio','player','embed','stream'];
    f.num_iframe_media = [...doc.querySelectorAll('iframe')].filter(fr => {
      const src = (fr.getAttribute('src') || '').toLowerCase();
      return MEDIA_KW.some(kw => src.includes(kw));
    }).length;

    // ── Scripts ──
    const allScripts = [...doc.querySelectorAll('script')];
    f.num_script_tags = allScripts.length;
    let numInline = 0, numExtScripts = 0;
    const scriptLens = [], scriptEnts = [];
    let numEval = 0, numSetTimeout = 0, numDocWrite = 0;
    for (const s of allScripts) {
      const c = s.textContent || '';
      scriptLens.push(c.length);
      if (s.getAttribute('src')) { numExtScripts++; }
      else {
        numInline++;
        if (c) scriptEnts.push(shannonEntropy(c.slice(0, 10000)));
      }
      numEval += countMatches(c, /\beval\s*\(/gi);
      numSetTimeout += countMatches(c, /\bset(?:Timeout|Interval)\s*\(/gi);
      numDocWrite += countMatches(c, /\bdocument\.write\s*\(/gi);
    }
    f.num_inline_scripts = numInline;
    f.num_external_scripts = numExtScripts;
    f.avg_script_length = mean(scriptLens);
    f.script_entropy_mean = mean(scriptEnts);
    f.num_eval_calls = numEval;
    f.num_settimeout_setinterval = numSetTimeout;
    f.num_document_write = numDocWrite;

    // ── Forms ──
    const forms = [...doc.querySelectorAll('form')];
    const inputs = [...doc.querySelectorAll('input')];
    f.num_forms = forms.length;
    f.num_input_fields = inputs.length;
    f.num_password_fields = inputs.filter(i => (i.getAttribute('type') || '').toLowerCase() === 'password').length;
    let submitCount = inputs.filter(i => (i.getAttribute('type') || '').toLowerCase() === 'submit').length;
    submitCount += [...doc.querySelectorAll('button')].filter(b => {
      const t = (b.getAttribute('type') || '').toLowerCase();
      return t === 'submit' || t === '';
    }).length;
    f.num_submit_buttons = submitCount;
    const nameLens = inputs.filter(i => i.getAttribute('name')).map(i => (i.getAttribute('name') || '').length);
    f.avg_input_name_length = mean(nameLens);
    f.num_textareas = doc.querySelectorAll('textarea').length;
    f.num_selects = doc.querySelectorAll('select').length;

    // ── Meta / CSS / iframe ──
    const metas = [...doc.querySelectorAll('meta')];
    f.num_meta_tags = metas.length;
    f.meta_charset_present = metas.some(m => m.getAttribute('charset')) ? 1 : 0;
    f.meta_viewport_present = metas.some(m => (m.getAttribute('name') || '').toLowerCase() === 'viewport') ? 1 : 0;
    const styleTags = [...doc.querySelectorAll('style')];
    f.num_style_tags = styleTags.length;
    const inlineStyleEls = allTags.filter(el => el.getAttribute('style'));
    f.num_inline_styles = inlineStyleEls.length;
    f.avg_style_length = mean(inlineStyleEls.map(el => (el.getAttribute('style') || '').length));
    const linkTags = [...doc.querySelectorAll('link')];
    let numExtCss = 0, numExtFonts = 0;
    for (const lk of linkTags) {
      const rel = (lk.getAttribute('rel') || '').toLowerCase();
      const href = lk.getAttribute('href') || '';
      if (rel.includes('stylesheet') && isExternal(href, host)) numExtCss++;
      const hrefL = href.toLowerCase();
      if (hrefL.includes('fonts.google') || hrefL.includes('fonts.gstatic') || hrefL.includes('font')) numExtFonts++;
    }
    for (const st of styleTags) {
      const c = (st.textContent || '').toLowerCase();
      if (c.includes('@import') && c.includes('font')) numExtFonts++;
    }
    f.num_external_css = numExtCss;
    f.num_external_fonts = numExtFonts;
    const iframes = [...doc.querySelectorAll('iframe')];
    f.num_iframe_tags = iframes.length;
    f.num_external_iframes = iframes.filter(fr => isExternal(fr.getAttribute('src') || '', host)).length;

    // ── Aggregated ──
    const totalAll = numTags + f.num_img_tags + f.num_script_tags + f.num_input_fields + f.num_iframe_tags;
    const extAll = f.num_external_images + f.num_external_scripts + f.num_external_css + f.num_external_iframes;
    const nonZeroEnts = [f.text_entropy, f.script_entropy_mean, f.link_entropy_mean].filter(v => v > 0);
    f.total_num_tags = totalAll;
    f.total_external_resources = extAll;
    f.avg_entropy_components = mean(nonZeroEnts);
    f.ratio_external_resources = totalAll > 0 ? extAll / totalAll : 0;
    f.ratio_self_closing = numTags > 0 ? f.num_self_closing_tags / numTags : 0;
    f.ratio_forms_per_tag = numTags > 0 ? f.num_forms / numTags : 0;
    f.ratio_scripts_per_tag = numTags > 0 ? f.num_script_tags / numTags : 0;
    f.ratio_links_per_tag = numTags > 0 ? f.num_links / numTags : 0;
    f.ratio_images_per_tag = totalAll > 0 ? f.num_img_tags / totalAll : 0;
    f.ratio_forms_with_password = f.num_forms > 0 ? f.num_password_fields / f.num_forms : 0;

    // ── Advanced HTML (raw string 기반) ──
    const lines = htmlSample.split('\n');
    f.html_char_length = html.length;
    f.html_line_count = lines.length;
    const lineLens = lines.map(l => l.length);
    const avgLineLen = mean(lineLens);
    f.avg_line_length = avgLineLen;
    f.line_length_std = stddev(lineLens, avgLineLen);

    const sLen = htmlSample.length;
    if (sLen > 0) {
      let alpha = 0, digit = 0, ws = 0, special = 0, nonAscii = 0;
      const unicodeLetterRe = /\p{L}/u;
      for (let i = 0; i < sLen; i++) {
        const c = htmlSample[i];
        const code = htmlSample.charCodeAt(i);
        if (code > 127) {
          // Python: c.isalpha() 유니코드 포함, 비ASCII도 alpha/special 분류
          nonAscii++;
          if (unicodeLetterRe.test(c)) alpha++;
          else if (!/\s/.test(c)) special++;
        } else {
          if (/[A-Za-z]/.test(c)) alpha++;
          else if (/[0-9]/.test(c)) digit++;
          else if (/\s/.test(c)) ws++;
          else special++;
        }
      }
      f.ratio_alpha_chars = alpha / sLen;
      f.ratio_digit_chars = digit / sLen;
      f.ratio_whitespace_chars = ws / sLen;
      f.ratio_special_chars = special / sLen;
      f.ratio_non_ascii_chars = nonAscii / sLen;
    } else {
      f.ratio_alpha_chars = f.ratio_digit_chars = f.ratio_whitespace_chars = f.ratio_special_chars = f.ratio_non_ascii_chars = 0;
    }

    f.html_char_entropy = shannonEntropy(htmlSample.slice(0, 100000));
    const nonEmptyLines = lines.filter(l => l.trim().length > 0);
    // 성능: 최대 500줄만 샘플링 (전체 처리 시 수천 줄 → 느림)
    const linesSample = nonEmptyLines.length > 500
      ? nonEmptyLines.slice(0, 250).concat(nonEmptyLines.slice(-250))
      : nonEmptyLines;
    f.html_line_entropy_mean = linesSample.length > 0
      ? mean(linesSample.map(l => shannonEntropy(l)))
      : 0;

    // Tag vocabulary
    f.total_tag_count = numTags;
    f.avg_tag_frequency = f.num_unique_tags > 0 ? numTags / f.num_unique_tags : 0;
    f.tag_entropy = shannonEntropy(allTags.slice(0, 2000).map(t => t.tagName.toLowerCase()).join(' '));

    // Attributes
    const attrNames = [], attrVals = [];
    for (const t of allTags.slice(0, 2000)) {
      for (const attr of t.attributes) {
        attrNames.push(attr.name);
        attrVals.push(attr.value);
      }
    }
    f.num_unique_attributes = new Set(attrNames).size;
    f.total_attribute_count = attrNames.length;
    f.avg_attributes_per_tag = numTags > 0 ? attrNames.length / Math.min(numTags, 2000) : 0;
    f.attribute_name_entropy = shannonEntropy(attrNames.join(' '));
    f.avg_attribute_name_length = mean(attrNames.map(n => n.length));
    f.avg_attribute_value_length = mean(attrVals.map(v => v.length));

    // Minified score
    if (sLen > 0) {
      f.minified_score = (1 - f.ratio_whitespace_chars) * 0.4
        + Math.min(avgLineLen / Math.max(avgLineLen, 100), 1) * 0.3
        + Math.min(1 / (lines.length + 1), 1) * 0.3;
    } else { f.minified_score = 0; }

    f.num_long_random_tokens = countMatches(htmlSample, /[A-Za-z0-9]{20,}/g);

    // Class/ID random tokens
    const classIds = [];
    for (const t of allTags.slice(0, 2000)) {
      const cls = t.getAttribute('class');
      if (cls) classIds.push(...cls.split(/\s+/).filter(c => c));
      const tid = t.getAttribute('id');
      if (tid) classIds.push(tid);
    }
    const rand = classIds.filter(s => s.length >= 10 && /^[A-Za-z0-9]+$/.test(s));
    f.ratio_random_class_id = classIds.length > 0 ? rand.length / classIds.length : 0;

    f.num_hex_like_strings = countMatches(htmlSample, /0x[0-9a-fA-F]{4,}|[0-9a-fA-F]{8,}/g);
    const b64Matches = (htmlSample.match(/[A-Za-z0-9+/=]{20,}/g) || []);
    f.num_base64_like_strings = b64Matches.filter(m => m.includes('=') || m.length % 4 === 0).length;

    let escCnt = 0;
    for (const re of [/\\x[0-9a-fA-F]{2}/g, /\\u[0-9a-fA-F]{4}/g, /&#x[0-9a-fA-F]+;/g, /&#[0-9]+;/g]) {
      escCnt += countMatches(htmlSample, re);
    }
    f.num_escape_sequences = escCnt;

    // Indent consistency
    const indents = lines.filter(l => l.trim()).map(l => l.length - l.trimStart().length);
    if (indents.length > 0) {
      const ic = Object.create(null);
      indents.forEach(i => ic[i] = (ic[i] || 0) + 1);
      const mc = parseInt(Object.entries(ic).sort((a, b) => b[1] - a[1])[0][0]);
      const avgDev = mean(indents.map(i => Math.abs(i - mc)));
      f.indent_consistency_score = Math.max(0, 1 - avgDev / 8);
    } else { f.indent_consistency_score = 0; }

    // ── DOM structure (iterative) ──
    const nodeDepths = [], nodeBranch = [];
    const stack = [[doc.documentElement, 0]];
    while (stack.length > 0) {
      const [el, d] = stack.pop();
      const nChildren = el.children.length;
      nodeDepths.push(d);
      nodeBranch.push(nChildren);
      for (const ch of el.children) stack.push([ch, d + 1]);
    }

    if (nodeDepths.length > 0) {
      const avgD = mean(nodeDepths);
      f.dom_depth_max = Math.max(...nodeDepths);
      f.dom_depth_mean = avgD;
      f.dom_depth_std = stddev(nodeDepths, avgD);
      const avgB = mean(nodeBranch);
      f.avg_branching_factor = avgB;
      f.branching_factor_std = stddev(nodeBranch, avgB);
      f.leaf_node_ratio = nodeBranch.filter(b => b === 0).length / nodeBranch.length;

      // Single child chain (iterative)
      function maxSingleChain(root) {
        let maxChain = 0;
        const st = [[root, 0]];
        while (st.length > 0) {
          const [el, chain] = st.pop();
          if (maxChain < chain) maxChain = chain;
          const ch = [...el.children];
          if (ch.length === 1) st.push([ch[0], chain + 1]);
          else for (const c of ch) st.push([c, 0]);
        }
        return maxChain;
      }
      f.single_child_chain_max = maxSingleChain(doc.documentElement);

      // repeated_subtree_ratio — Python과 동일한 서브트리 시그니처 계산 (최대 3000 노드)
      (function () {
        const MAX_NODES = 1000;
        const MAX_DEPTH = 4; // 재귀 깊이 제한 (성능)
        function nodeSig(el, d) {
          if (d >= MAX_DEPTH) return el.tagName.toLowerCase();
          const childSigs = [...el.children].map(c => nodeSig(c, d + 1)).join(',');
          return el.tagName.toLowerCase() + (childSigs ? '(' + childSigs + ')' : '');
        }
        const sigCounts = Object.create(null);
        const limited = allTags.slice(0, MAX_NODES);
        for (const t of limited) {
          const s = nodeSig(t, 0);
          sigCounts[s] = (sigCounts[s] || 0) + 1;
        }
        const totalSubs = limited.length;
        const repeatedTypes = Object.values(sigCounts).filter(v => v > 1).length;
        f.repeated_subtree_ratio = totalSubs > 0 ? repeatedTypes / totalSubs : 0;
      })();
    } else {
      f.dom_depth_max = f.dom_depth_mean = f.dom_depth_std = 0;
      f.avg_branching_factor = f.branching_factor_std = 0;
      f.leaf_node_ratio = f.single_child_chain_max = f.repeated_subtree_ratio = 0;
    }

    // User input / click inducement
    const textLen = bodyText.length;
    f.form_to_text_ratio = textLen > 0 ? forms.length / textLen : 0;
    const hidden = inputs.filter(i => (i.getAttribute('type') || '').toLowerCase() === 'hidden');
    f.hidden_input_ratio = inputs.length > 0 ? hidden.length / inputs.length : 0;
    const btns = [...doc.querySelectorAll('button')];
    const subInputs = inputs.filter(i => (i.getAttribute('type') || '').toLowerCase() === 'submit');
    f.num_buttons = btns.length + subInputs.length;
    f.button_density = numTags > 0 ? f.num_buttons / numTags : 0;
    f.link_to_text_ratio = textLen > 0 ? anchors.length / textLen : 0;
    f.image_link_ratio = anchors.length > 0 ? anchors.filter(a => a.querySelector('img')).length / anchors.length : 0;
    f.num_autofocus_inputs = inputs.filter(i => i.hasAttribute('autofocus')).length;

    let hasAutoSubmit = 0;
    for (const form of forms) {
      const fi = [...form.querySelectorAll('input')];
      const fb = [...form.querySelectorAll('button[type="submit"]'), ...fi.filter(i => (i.getAttribute('type') || '').toLowerCase() === 'submit')];
      if ((fi.length === 1 && fb.length > 0) || form.getAttribute('onsubmit')) { hasAutoSubmit = 1; break; }
    }
    f.has_auto_submit_pattern = hasAutoSubmit;

    // Security indicators
    const nFr = iframes.length;
    if (nFr > 0) {
      f.external_iframe_ratio = iframes.filter(fr => isExternal(fr.getAttribute('src') || '', host)).length / nFr;
      f.sandbox_iframe_ratio = iframes.filter(fr => !fr.hasAttribute('sandbox')).length / nFr;
    } else { f.external_iframe_ratio = f.sandbox_iframe_ratio = 0; }

    f.num_meta_refresh = [...doc.querySelectorAll('meta')].filter(m =>
      /refresh/i.test(m.getAttribute('http-equiv') || '')).length;

    const blank = anchors.filter(a => (a.getAttribute('target') || '').toLowerCase() === '_blank');
    f.target_blank_unsafe_ratio = blank.length > 0
      ? blank.filter(a => !a.getAttribute('rel')).length / blank.length : 0;

    f.mixed_content_hint = (htmlSample.match(/http:\/\/[^\s"'<>]+/g) || []).length > 0 ? 1 : 0;

    return f;
  }

  // ─── 피처 벡터 조합 ───────────────────────────────────────────────────────
  function buildFeatureVector(urlF, htmlF) {
    return FEATURE_ORDER.map(name => {
      const v = (urlF[name] !== undefined ? urlF[name] : htmlF[name]);
      if (v === undefined || v === null || isNaN(v)) return 0.0;
      return Number(v);
    });
  }

  // ─── 메시지 전송 (재시도) ────────────────────────────────────────────────
  // background SW + offscreen 모델 로드 완료까지 대기 (최대 ~30초)
  async function sendWithRetry(message, maxAttempts = 15, delayMs = 1000) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const resp = await new Promise((resolve, reject) => {
          const t = setTimeout(() => reject(new Error('timeout')), 8000);
          chrome.runtime.sendMessage(message, (r) => {
            clearTimeout(t);
            if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
            resolve(r);
          });
        });
        if (resp && resp.ok) return; // 성공
        // ok가 아니어도 (추론 오류) 저장은 됐으므로 종료
        return;
      } catch (e) {
        const msg = e.message || '';
        // SW 미실행 또는 채널 없음 → 재시도
        const retryable = msg.includes('established') || msg.includes('exist') || msg.includes('timeout') || msg.includes('context');
        if (!retryable || i === maxAttempts - 1) {
          console.warn('[필상] 메시지 전송 포기:', msg);
          return;
        }
        await new Promise(r => setTimeout(r, delayMs));
        delayMs = Math.min(delayMs * 1.3, 3000);
      }
    }
  }

  // ─── 메인 실행 ───────────────────────────────────────────────────────────
  // 중복 동시 실행 방지 (자동 + 재분석 동시 주입 시 충돌 방지)
  if (window.__pilsang_running) return;
  window.__pilsang_running = true;
  window.__pilsang_cancel = false; // 취소 플래그 초기화

  async function run() {
    const url = window.location.href;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      window.__pilsang_running = false;
      return;
    }

    try {
      // ── 타이밍 통일: 자동 추론 / 재분석 모두 페이지 완전 로드 후 추출 ──
      // window.load 완료 대기 (이미 완료됐으면 즉시 통과)
      await new Promise(resolve => {
        if (document.readyState === 'complete') resolve();
        else window.addEventListener('load', resolve, { once: true });
      });
      if (window.__pilsang_cancel) return; // 재분석 버튼으로 취소된 경우

      // 동적 렌더링 대기 — 이미 콘텐츠가 있으면 300ms, 없으면 최대 800ms
      const hasContent = document.body && document.body.innerText.trim().length > 100;
      await new Promise(r => setTimeout(r, hasContent ? 300 : 800));
      if (window.__pilsang_cancel) return; // 재분석 버튼으로 취소된 경우

      // 현재 URL 재확인 (SPA 내비게이션으로 URL이 바뀐 경우 중단)
      if (window.location.href !== url) return;

      let hostname = '';
      try { hostname = new URL(url).hostname; } catch {}

      const urlFeatures = extractUrlFeatures(url);
      const htmlFeatures = extractHtmlFeatures(hostname);
      const vector = buildFeatureVector(urlFeatures, htmlFeatures);

      await sendWithRetry({ type: 'FEATURES', url, vector });
    } catch (e) {
      console.warn('[필상] 특성 추출 오류:', e);
    } finally {
      window.__pilsang_running = false;
    }
  }

  run();
})();
