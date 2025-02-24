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
    var sectionBottom = navbarOffset + navbar.offsetHeight; // Bottom position of the navbar section

    console.log("📌 Navbar offset top:", navbarOffset);
    console.log("📌 Navbar height:", navbarHeight);
    console.log("📌 Form height:", formHeight);
    console.log("📌 Section bottom:", sectionBottom);

    window.addEventListener("scroll", function () {
        var scrollPosition = window.scrollY; // ✅ Use scrollY (replaces pageYOffset)
        console.log("🔄 Window scroll position:", scrollPosition);

        var formBottomPosition = scrollPosition + navbarHeight + formHeight;

        if (scrollPosition >= navbarOffset + navbarHeight) {
            if (formBottomPosition <= sectionBottom) {
                // Stick the form under the navbar
                stickyElement.classList.add("sticky");
                stickyElement.style.position = "fixed";
                stickyElement.style.top = navbarHeight + "px";
                console.log("✅ Sticky class added.");
            } else {
                // Stop moving when reaching the bottom of the section
                stickyElement.classList.remove("sticky");
                stickyElement.style.position = "absolute";
                stickyElement.style.top = (sectionBottom - formHeight) + "px";
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