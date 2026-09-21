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

    if (contentType.includes("text/html")) {
      let html = await response.text();

      const audioCode = `
<audio
  id="ayahAudio"
  src="/ayah.mp3"
  preload="auto"
  playsinline
></audio>

<div
  id="ayahPlayButton"
  style="
    position:fixed;
    bottom:20px;
    left:50%;
    transform:translateX(-50%);
    z-index:999999;
    background:#111;
    color:white;
    padding:12px 20px;
    border-radius:30px;
    font-family:Arial,sans-serif;
    font-size:16px;
    cursor:pointer;
    box-shadow:0 4px 15px rgba(0,0,0,.3);
  "
>
  🔊 اضغط للاستماع للآية
</div>

<script>
(function () {
  const audio = document.getElementById("ayahAudio");
  const button = document.getElementById("ayahPlayButton");

  if (!audio) return;

  audio.volume = 1;

  function playAyah() {
    return audio.play().then(function () {
      if (button) {
        button.style.display = "none";
      }
    }).catch(function () {
      if (button) {
        button.style.display = "block";
      }
    });
  }

  // محاولة التشغيل تلقائيًا
  playAyah();

  // التشغيل عند الضغط
  if (button) {
    button.addEventListener("click", function () {
      playAyah();
    });
  }

  // محاولة التشغيل عند أول تفاعل
  function firstInteraction() {
    playAyah();

    document.removeEventListener("click", firstInteraction);
    document.removeEventListener("touchstart", firstInteraction);
  }

  document.addEventListener("click", firstInteraction);
  document.addEventListener("touchstart", firstInteraction);
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
