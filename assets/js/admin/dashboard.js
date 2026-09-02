/**
 * BrandMakingTracktor — Admin dashboard: list, publish/unpublish, archive,
 * delete blog posts. Category management lives inline at the bottom.
 */
(function () {
  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  function statusBadgeClass(status) {
    return { draft: "badge", published: "badge", archived: "badge" }[status] || "badge";
  }

  function renderRow(post) {
    var category = post.blog_categories ? post.blog_categories.name : "&mdash;";
    return (
      "<tr>" +
      "<td>" + escapeHtml(post.title) + "<div class=\"text-muted\" style=\"font-size:.78rem\">/" + escapeHtml(post.slug) + "</div></td>" +
      "<td>" + category + "</td>" +
      '<td><span class="' + statusBadgeClass(post.status) + '">' + post.status + "</span></td>" +
      "<td>" + (post.published_at ? new Date(post.published_at).toLocaleDateString() : "&mdash;") + "</td>" +
      '<td class="admin-row-actions">' +
      '<a class="btn btn-sm btn-secondary" href="/blog/editor?id=' + post.id + '">Edit</a>' +
      (post.status === "published"
        ? '<button class="btn btn-sm btn-secondary" data-action="unpublish" data-id="' + post.id + '">Unpublish</button>'
        : '<button class="btn btn-sm btn-primary" data-action="publish" data-id="' + post.id + '">Publish</button>') +
      (post.status !== "archived"
        ? '<button class="btn btn-sm btn-secondary" data-action="archive" data-id="' + post.id + '">Archive</button>'
        : "") +
      '<button class="btn btn-sm btn-danger" data-action="delete" data-id="' + post.id + '">Delete</button>' +
      "</td>" +
      "</tr>"
    );
  }

  function loadPosts() {
    var tbody = document.getElementById("postsTableBody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5">Loading posts...</td></tr>';

    window.bmtSupabase
      .from("blog_posts")
      .select("id, title, slug, status, published_at, blog_categories(name)")
      .order("created_at", { ascending: false })
      .then(function (res) {
        if (res.error) {
          tbody.innerHTML = '<tr><td colspan="5">Failed to load posts: ' + escapeHtml(res.error.message) + "</td></tr>";
          return;
        }
        var posts = res.data || [];
        tbody.innerHTML = posts.length
          ? posts.map(renderRow).join("")
          : '<tr><td colspan="5">No blog posts yet. Create your first one.</td></tr>';
      });
  }

  function loadCategories() {
    var list = document.getElementById("categoryList");
    if (!list) return;
    window.bmtSupabase
      .from("blog_categories")
      .select("id, name, slug")
      .order("name", { ascending: true })
      .then(function (res) {
        if (res.error) return;
        var categories = res.data || [];
        list.innerHTML = categories.length
          ? categories
              .map(function (c) {
                return (
                  '<li class="flex justify-between items-center" style="padding:8px 0;border-bottom:1px solid var(--border)">' +
                  "<span>" + escapeHtml(c.name) + ' <span class="text-muted">(/' + escapeHtml(c.slug) + ")</span></span>" +
                  '<button class="btn btn-sm btn-secondary" data-action="delete-category" data-id="' + c.id + '">Remove</button>' +
                  "</li>"
                );
              })
              .join("")
          : '<li class="text-muted">No categories yet.</li>';
      });
  }

  function handleTableClick(e) {
    var btn = e.target.closest("button[data-action]");
    if (!btn) return;
    var id = btn.getAttribute("data-id");
    var action = btn.getAttribute("data-action");

    if (action === "publish" || action === "unpublish") {
      var update =
        action === "publish"
          ? { status: "published", published_at: new Date().toISOString() }
          : { status: "draft" };
      window.bmtSupabase
        .from("blog_posts")
        .update(update)
        .eq("id", id)
        .then(function () {
          loadPosts();
        });
    }

    if (action === "archive") {
      window.bmtSupabase
        .from("blog_posts")
        .update({ status: "archived" })
        .eq("id", id)
        .then(function () {
          loadPosts();
        });
    }

    if (action === "delete") {
      if (!window.confirm("Permanently delete this blog post? This cannot be undone.")) return;
      window.bmtSupabase
        .from("blog_posts")
        .delete()
        .eq("id", id)
        .then(function () {
          loadPosts();
        });
    }

    if (action === "delete-category") {
      if (!window.confirm("Remove this category? Posts using it will keep their category_id as null.")) return;
      window.bmtSupabase
        .from("blog_categories")
        .delete()
        .eq("id", id)
        .then(function () {
          loadCategories();
        });
    }
  }

  function slugify(str) {
    return String(str || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function handleCategoryForm() {
    var form = document.getElementById("newCategoryForm");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var nameInput = document.getElementById("newCategoryName");
      var name = nameInput.value.trim();
      if (!name) return;
      window.bmtSupabase
        .from("blog_categories")
        .insert([{ name: name, slug: slugify(name) }])
        .then(function (res) {
          if (res.error) {
            window.alert("Could not create category: " + res.error.message);
            return;
          }
          nameInput.value = "";
          loadCategories();
        });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!window.BMT_ADMIN) return;
    window.BMT_ADMIN.requireSession(function (session) {
      var emailEl = document.getElementById("adminUserEmail");
      if (emailEl) emailEl.textContent = session.user.email;
      loadPosts();
      loadCategories();
      handleCategoryForm();
    });

    var logoutBtn = document.getElementById("adminLogoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", window.BMT_ADMIN.logout);

    var tbody = document.getElementById("postsTableBody");
    if (tbody) tbody.addEventListener("click", handleTableClick);

    var categoryList = document.getElementById("categoryList");
    if (categoryList) categoryList.addEventListener("click", handleTableClick);
  });
})();
