/**
 * BrandMakingTractor — Blog listing (/blog/index.html).
 * Reads only `status = published` posts, newest first (RLS enforces this
 * server-side too — see /supabase/schema.sql).
 */
(function () {
  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  function formatDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  function estimateReadTime(html) {
    var text = String(html || "").replace(/<[^>]*>/g, " ");
    var words = text.trim().split(/\s+/).filter(Boolean).length;
    var minutes = Math.max(1, Math.round(words / 200));
    return minutes + " min read";
  }

  function renderCard(post) {
    var image = post.featured_image
      ? '<img src="' + escapeHtml(post.featured_image) + '" alt="' + escapeHtml(post.title) + '" loading="lazy">'
      : "";
    var category = post.blog_categories ? post.blog_categories.name : post.category_name;
    return (
      '<a class="blog-card" href="/blog/' + encodeURIComponent(post.slug) + '">' +
      '<div class="blog-card-image">' + image + "</div>" +
      '<div class="blog-card-body">' +
      (category ? '<span class="badge">' + escapeHtml(category) + "</span>" : "") +
      "<h3>" + escapeHtml(post.title) + "</h3>" +
      "<p>" + escapeHtml(post.excerpt || "") + "</p>" +
      '<div class="meta">' + escapeHtml(post.author || "BrandMakingTractor") + " &middot; " + formatDate(post.published_at) + " &middot; " + estimateReadTime(post.content) + "</div>" +
      "</div>" +
      "</a>"
    );
  }

  function loadPosts() {
    var grid = document.getElementById("blogGrid");
    if (!grid || !window.bmtSupabase) return;

    window.bmtSupabase
      .from("blog_posts")
      .select("id, title, slug, excerpt, content, featured_image, author, published_at, blog_categories(name)")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .then(function (res) {
        if (res.error) {
          console.error(res.error);
          grid.innerHTML = '<div class="blog-error">Unable to load blog posts right now. Please try again later.</div>';
          return;
        }
        var posts = res.data || [];
        if (posts.length === 0) {
          grid.innerHTML = '<div class="blog-empty">No blog posts published yet. Check back soon.</div>';
          return;
        }
        grid.innerHTML = posts.map(renderCard).join("");
      })
      .catch(function (err) {
        console.error(err);
        grid.innerHTML = '<div class="blog-error">Unable to load blog posts right now. Please try again later.</div>';
      });
  }

  document.addEventListener("DOMContentLoaded", loadPosts);
})();
