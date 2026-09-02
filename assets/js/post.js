/**
 * BrandMakingTracktor — Single blog post (/blog/[slug]).
 * Served by /blog/post.html for any /blog/<slug> URL via .htaccess rewrite
 * (see /.htaccess). Slug is read from the visible URL path so the rewrite
 * can stay a plain internal rewrite with no query-string juggling; falls
 * back to ?slug= for local testing without the rewrite rule active.
 *
 * Also loads a "Popular Blogs" sidebar (6 other published posts, newest
 * first) to match the single-post + sidebar layout used across the site.
 */
(function () {
  function getSlugFromUrl() {
    var segments = window.location.pathname.split("/").filter(Boolean);
    var last = segments[segments.length - 1];
    if (last && last !== "post.html" && last !== "blog") return decodeURIComponent(last);
    var params = new URLSearchParams(window.location.search);
    return params.get("slug");
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  function formatDate(iso, style) {
    if (!iso) return "";
    var d = new Date(iso);
    return d.toLocaleDateString("en-US", style || { year: "numeric", month: "long", day: "numeric" });
  }

  function estimateReadTime(html) {
    var text = String(html || "").replace(/<[^>]*>/g, " ");
    var words = text.trim().split(/\s+/).filter(Boolean).length;
    var minutes = Math.max(1, Math.round(words / 200));
    return minutes + " min read";
  }

  function setMeta(post) {
    var title = (post.meta_title || post.title) + " | BrandMakingTracktor Blog";
    document.title = title;
    var descTag = document.querySelector('meta[name="description"]');
    if (descTag) descTag.setAttribute("content", post.meta_description || post.excerpt || "");
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", post.meta_title || post.title);
    var ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", post.meta_description || post.excerpt || "");
    var ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage && post.featured_image) ogImage.setAttribute("content", post.featured_image);
    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", "https://brandmakingtractor.com/blog/" + post.slug);
    else {
      var link = document.createElement("link");
      link.rel = "canonical";
      link.href = "https://brandmakingtractor.com/blog/" + post.slug;
      document.head.appendChild(link);
    }
  }

  function renderPost(post) {
    setMeta(post);

    var category = post.blog_categories ? post.blog_categories.name : null;
    document.getElementById("postBadge").textContent = category || "Insights";
    document.getElementById("postTitle").textContent = post.title;
    document.getElementById("postAuthor").textContent = post.author || "BrandMakingTracktor";
    document.getElementById("postDate").textContent = formatDate(post.published_at);
    document.getElementById("postReadTime").textContent = estimateReadTime(post.content);

    var heroWrap = document.getElementById("postHeroImage");
    if (post.featured_image) {
      heroWrap.innerHTML = '<img src="' + escapeHtml(post.featured_image) + '" alt="' + escapeHtml(post.title) + '">';
    } else {
      heroWrap.hidden = true;
    }

    // Content is authored by trusted admin CMS users only (see /blog/editor).
    document.getElementById("postContent").innerHTML = post.content || "";

    document.getElementById("postLoading").hidden = true;
    document.getElementById("postBody").hidden = false;

    if (window.BMT && window.BMT.track) {
      window.BMT.track.blogView(post.slug, { post_title: post.title });
    }

    loadPopularBlogs(post.slug);
  }

  function renderPopularItem(p) {
    var img = p.featured_image
      ? '<img src="' + escapeHtml(p.featured_image) + '" alt="' + escapeHtml(p.title) + '" loading="lazy">'
      : "";
    return (
      '<a class="popular-blog-item" href="/blog/' + encodeURIComponent(p.slug) + '">' +
      '<div class="popular-blog-thumb">' + img + "</div>" +
      '<div class="popular-blog-meta">' +
      '<div class="popular-blog-date">' + formatDate(p.published_at, { year: "numeric", month: "short", day: "numeric" }) + "</div>" +
      '<div class="popular-blog-title">' + escapeHtml(p.title) + "</div>" +
      '<div class="popular-blog-readtime"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>' + estimateReadTime(p.content) + "</div>" +
      "</div>" +
      "</a>"
    );
  }

  function loadPopularBlogs(currentSlug) {
    var list = document.getElementById("popularBlogsList");
    if (!list || !window.bmtSupabase) return;
    window.bmtSupabase
      .from("blog_posts")
      .select("title, slug, featured_image, published_at, content")
      .eq("status", "published")
      .neq("slug", currentSlug)
      .order("published_at", { ascending: false })
      .limit(6)
      .then(function (res) {
        var posts = res.data || [];
        if (res.error || posts.length === 0) {
          list.innerHTML = '<div class="text-muted" style="padding:20px;font-size:0.85rem;">No other posts yet.</div>';
          return;
        }
        list.innerHTML = posts.map(renderPopularItem).join("");
      })
      .catch(function () {
        list.innerHTML = '<div class="text-muted" style="padding:20px;font-size:0.85rem;">Unable to load posts.</div>';
      });
  }

  function renderNotFound() {
    document.getElementById("postLoading").hidden = true;
    document.getElementById("postNotFound").hidden = false;
  }

  function loadPost() {
    var slug = getSlugFromUrl();
    if (!slug || !window.bmtSupabase) {
      renderNotFound();
      return;
    }
    window.bmtSupabase
      .from("blog_posts")
      .select("*, blog_categories(name, slug)")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle()
      .then(function (res) {
        if (res.error || !res.data) {
          console.error(res.error);
          renderNotFound();
          return;
        }
        renderPost(res.data);
      })
      .catch(function (err) {
        console.error(err);
        renderNotFound();
      });
  }

  document.addEventListener("DOMContentLoaded", loadPost);
})();
