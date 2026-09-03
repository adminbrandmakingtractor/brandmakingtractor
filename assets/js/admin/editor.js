/**
 * BrandMakingTractor — Admin blog editor (create + edit).
 * /blog/editor            -> create mode
 * /blog/editor?id=<uuid>  -> edit mode
 * Content is authored in a contenteditable area with a small formatting
 * toolbar (bold/italic/headings/lists/quote) plus one-click internal links
 * and a prompt-based external link/backlink inserter — no HTML knowledge
 * required. Featured images upload to the Supabase Storage `blog-images`
 * public bucket.
 */
(function () {
  function slugify(str) {
    return String(str || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function getPostId() {
    return new URLSearchParams(window.location.search).get("id");
  }

  function loadCategoriesInto(selectEl, selectedId) {
    return window.bmtSupabase
      .from("blog_categories")
      .select("id, name")
      .order("name", { ascending: true })
      .then(function (res) {
        var categories = (res.data || []);
        selectEl.innerHTML =
          '<option value="">Select a category</option>' +
          categories
            .map(function (c) {
              return '<option value="' + c.id + '"' + (c.id === selectedId ? " selected" : "") + ">" + c.name + "</option>";
            })
            .join("");
      });
  }

  function fillForm(post) {
    document.getElementById("editorTitle").value = post.title || "";
    document.getElementById("editorSlug").value = post.slug || "";
    document.getElementById("editorExcerpt").value = post.excerpt || "";
    document.getElementById("editorContent").innerHTML = post.content || "";
    document.getElementById("editorAuthor").value = post.author || "";
    document.getElementById("editorMetaTitle").value = post.meta_title || "";
    document.getElementById("editorMetaDescription").value = post.meta_description || "";
    document.getElementById("editorStatus").value = post.status || "draft";
    document.getElementById("editorFeaturedImageUrl").value = post.featured_image || "";
    if (post.featured_image) {
      document.getElementById("editorImagePreview").src = post.featured_image;
      document.getElementById("editorImagePreview").hidden = false;
    }
  }

  function uploadImageIfNeeded() {
    var fileInput = document.getElementById("editorImageFile");
    var urlField = document.getElementById("editorFeaturedImageUrl");
    var file = fileInput.files[0];
    if (!file) return Promise.resolve(urlField.value || null);

    var path = "posts/" + Date.now() + "-" + file.name.replace(/[^a-zA-Z0-9._-]/g, "");
    return window.bmtSupabase.storage
      .from("blog-images")
      .upload(path, file, { upsert: false })
      .then(function (res) {
        if (res.error) throw res.error;
        var pub = window.bmtSupabase.storage.from("blog-images").getPublicUrl(path);
        return pub.data.publicUrl;
      });
  }

  function initToolbar() {
    var contentArea = document.getElementById("editorContent");
    var toolbar = document.getElementById("editorToolbar");
    if (!contentArea || !toolbar) return;

    // mousedown + preventDefault keeps the current text selection alive —
    // otherwise clicking a toolbar button blurs the editable area first.
    toolbar.querySelectorAll("button[data-cmd]").forEach(function (btn) {
      btn.addEventListener("mousedown", function (e) {
        e.preventDefault();
        contentArea.focus();
        document.execCommand(btn.getAttribute("data-cmd"), false, null);
      });
    });

    toolbar.querySelectorAll("button[data-block]").forEach(function (btn) {
      btn.addEventListener("mousedown", function (e) {
        e.preventDefault();
        contentArea.focus();
        document.execCommand("formatBlock", false, btn.getAttribute("data-block"));
      });
    });

    var internalLinkSelect = document.getElementById("internalLinkSelect");
    if (internalLinkSelect) {
      internalLinkSelect.addEventListener("mousedown", function () {
        contentArea.focus();
      });
      internalLinkSelect.addEventListener("change", function () {
        var url = internalLinkSelect.value;
        if (!url) return;
        contentArea.focus();
        var selection = window.getSelection();
        if (selection && selection.toString().trim()) {
          document.execCommand("createLink", false, url);
        } else {
          document.execCommand("insertHTML", false, '<a href="' + url + '">' + internalLinkSelect.options[internalLinkSelect.selectedIndex].text + "</a>");
        }
        internalLinkSelect.value = "";
      });
    }

    var backlinkBtn = document.getElementById("insertBacklinkBtn");
    if (backlinkBtn) {
      backlinkBtn.addEventListener("mousedown", function (e) {
        e.preventDefault();
        contentArea.focus();
        var url = window.prompt("Link to (include https://):", "https://");
        if (!url) return;
        var selection = window.getSelection();
        if (selection && selection.toString().trim()) {
          document.execCommand("createLink", false, url);
          // createLink doesn't let us set target/rel — patch the link we just made.
          selection.anchorNode && selection.anchorNode.parentElement &&
            tagifyLastLink(contentArea, url);
        } else {
          var label = window.prompt("Link text:", url) || url;
          document.execCommand(
            "insertHTML",
            false,
            '<a href="' + url + '" target="_blank" rel="noopener">' + label + "</a>"
          );
        }
      });
    }

    function tagifyLastLink(root, href) {
      var links = root.querySelectorAll('a[href="' + href.replace(/"/g, "") + '"]');
      var last = links[links.length - 1];
      if (last) {
        last.setAttribute("target", "_blank");
        last.setAttribute("rel", "noopener");
      }
    }

    var removeLinkBtn = document.getElementById("removeLinkBtn");
    if (removeLinkBtn) {
      removeLinkBtn.addEventListener("mousedown", function (e) {
        e.preventDefault();
        contentArea.focus();
        document.execCommand("unlink", false, null);
      });
    }

    var clearFormatBtn = document.getElementById("clearFormatBtn");
    if (clearFormatBtn) {
      clearFormatBtn.addEventListener("mousedown", function (e) {
        e.preventDefault();
        contentArea.focus();
        document.execCommand("removeFormat", false, null);
        document.execCommand("formatBlock", false, "p");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!window.BMT_ADMIN) return;

    initToolbar();

    window.BMT_ADMIN.requireSession(function () {
      var postId = getPostId();
      var categorySelect = document.getElementById("editorCategory");
      var heading = document.getElementById("editorHeading");
      var deleteBtn = document.getElementById("editorDeleteBtn");
      var statusEl = document.getElementById("editorStatus_msg");

      var currentSelectedCategory = null;

      var initialLoad = postId
        ? window.bmtSupabase.from("blog_posts").select("*").eq("id", postId).maybeSingle().then(function (res) {
            if (res.error || !res.data) {
              window.alert("Post not found.");
              window.location.href = "/blog/dashboard";
              return;
            }
            heading.textContent = "Edit Post";
            deleteBtn.hidden = false;
            currentSelectedCategory = res.data.category_id;
            fillForm(res.data);
          })
        : Promise.resolve();

      initialLoad.then(function () {
        loadCategoriesInto(categorySelect, currentSelectedCategory);
      });

      document.getElementById("editorTitle").addEventListener("input", function (e) {
        var slugField = document.getElementById("editorSlug");
        if (!slugField.dataset.userEdited) {
          slugField.value = slugify(e.target.value);
        }
      });
      document.getElementById("editorSlug").addEventListener("input", function (e) {
        e.target.dataset.userEdited = "true";
      });

      document.getElementById("editorImageFile").addEventListener("change", function (e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (evt) {
          var preview = document.getElementById("editorImagePreview");
          preview.src = evt.target.result;
          preview.hidden = false;
        };
        reader.readAsDataURL(file);
      });

      document.getElementById("postEditorForm").addEventListener("submit", function (e) {
        e.preventDefault();
        var submitBtn = document.getElementById("editorSubmitBtn");
        submitBtn.disabled = true;
        submitBtn.textContent = "Saving...";

        uploadImageIfNeeded()
          .then(function (imageUrl) {
            var status = document.getElementById("editorStatus").value;
            var payload = {
              title: document.getElementById("editorTitle").value.trim(),
              slug: slugify(document.getElementById("editorSlug").value),
              excerpt: document.getElementById("editorExcerpt").value.trim(),
              content: document.getElementById("editorContent").innerHTML,
              author: document.getElementById("editorAuthor").value.trim() || null,
              category_id: categorySelect.value || null,
              meta_title: document.getElementById("editorMetaTitle").value.trim() || null,
              meta_description: document.getElementById("editorMetaDescription").value.trim() || null,
              status: status,
              featured_image: imageUrl
            };

            if (status === "published") {
              payload.published_at = new Date().toISOString();
            }

            var query = postId
              ? window.bmtSupabase.from("blog_posts").update(payload).eq("id", postId)
              : window.bmtSupabase.from("blog_posts").insert([payload]);

            return query;
          })
          .then(function (res) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Save Post";
            if (res.error) {
              window.BMT.forms.showStatus(statusEl, "Error: " + res.error.message, "error");
              return;
            }
            window.BMT.forms.showStatus(statusEl, "Saved successfully.", "success");
            setTimeout(function () {
              window.location.href = "/blog/dashboard";
            }, 700);
          })
          .catch(function (err) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Save Post";
            window.BMT.forms.showStatus(statusEl, "Upload error: " + err.message, "error");
          });
      });

      deleteBtn.addEventListener("click", function () {
        if (!postId) return;
        if (!window.confirm("Permanently delete this post?")) return;
        window.bmtSupabase
          .from("blog_posts")
          .delete()
          .eq("id", postId)
          .then(function () {
            window.location.href = "/blog/dashboard";
          });
      });
    });

    var logoutBtn = document.getElementById("adminLogoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", window.BMT_ADMIN.logout);
  });
})();
