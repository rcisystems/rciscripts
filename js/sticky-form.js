document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ DOM fully loaded and parsed.");

    var stickyElement = document.getElementById("form-pibcjgcQpF");
    var navbar = document.getElementById("section-rjLfyckuu");

    if (!stickyElement) {
        console.error("❌ Form element #form-pibcjgcQpF not found.");
        return;
    }
    if (!navbar) {
        console.error("❌ Navbar element #section-rjLfyckuu not found.");
        return;
    }

    console.log("✅ Sticky element found:", stickyElement);
    console.log("✅ Navbar element found:", navbar);

    var navbarOffset = navbar.offsetTop;
    var navbarHeight = navbar.offsetHeight;
    var formHeight = stickyElement.offsetHeight;
    var stopPosition = navbarOffset + navbarHeight - formHeight; // Stop point for sticky element

    console.log("📌 Navbar offset top:", navbarOffset);
    console.log("📌 Navbar height:", navbarHeight);
    console.log("📌 Form height:", formHeight);
    console.log("📌 Stop position for sticky form:", stopPosition);

    window.addEventListener("scroll", function () {
        var scrollPosition = window.scrollY; // ✅ Future-proof (replaces pageYOffset)
        console.log("🔄 Window scroll position:", scrollPosition);

        if (scrollPosition >= (navbarOffset + navbarHeight)) {
            if (scrollPosition <= stopPosition) {
                // Stick to top
                stickyElement.classList.add("sticky");
                stickyElement.style.top = navbarHeight + "px";
                console.log("✅ Sticky class added.");
            } else {
                // Stop moving when reaching the bottom of the section
                stickyElement.classList.remove("sticky");
                stickyElement.style.position = "absolute";
                stickyElement.style.top = (stopPosition - navbarOffset) + "px";
                console.log("🛑 Sticky element stopped at bottom.");
            }
        } else {
            // Remove sticky before reaching navbar
            stickyElement.classList.remove("sticky");
            stickyElement.style.position = "relative";
            stickyElement.style.top = "auto";
            console.log("❌ Sticky class removed.");
        }
    });
});