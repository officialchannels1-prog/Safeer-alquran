export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({
        ok: true,
        project: "سفير القرآن"
      });
    }

    const response = await env.ASSETS.fetch(request);

    const contentType = response.headers.get("content-type") || "";

    // لو الملف صفحة HTML، نضيف كود تشغيل الآية
    if (contentType.includes("text/html")) {
      let html = await response.text();

      const audioCode = `
<audio
  id="ayahAudio"
  src="/ayah.mp3"
  preload="auto"
  playsinline
></audio>

<script>
(function () {
  const audio = document.getElementById("ayahAudio");

  if (!audio) return;

  audio.volume = 1;

  function playAyah() {
    audio.play().catch(function () {
      console.log("Autoplay blocked by browser");
    });
  }

  // محاولة تشغيل الآية تلقائيًا
  playAyah();

  // إذا منع المتصفح التشغيل التلقائي،
  // أول لمسة أو ضغطة على الصفحة تشغل الآية
  function startAfterInteraction() {
    playAyah();

    document.removeEventListener("click", startAfterInteraction);
    document.removeEventListener("touchstart", startAfterInteraction);
  }

  document.addEventListener("click", startAfterInteraction);
  document.addEventListener("touchstart", startAfterInteraction);
})();
</script>
`;

      if (html.includes("</body>")) {
        html = html.replace("</body>", audioCode + "</body>");
      } else {
        html += audioCode;
      }

      const headers = new Headers(response.headers);
      headers.set("content-type", "text/html; charset=UTF-8");

      return new Response(html, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }

    return response;
  }
};
