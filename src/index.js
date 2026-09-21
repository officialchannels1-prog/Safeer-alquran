export default {

  async fetch(request, env) {

    const url = new URL(request.url);


    // =========================
    // HEALTH CHECK
    // =========================

    if (url.pathname === "/api/health") {

      return Response.json({
        ok: true,
        project: "سفير القرآن"
      });

    }


    // =========================
    // APPLY
    // =========================

    if (
      url.pathname === "/api/apply" &&
      request.method === "POST"
    ) {

      try {

        const data =
        await request.json();


        // =========================
        // البيانات
        // =========================

        const name =
        String(data.name || "").trim();

        const phone =
        String(data.phone || "").trim();

        const governorate =
        String(data.governorate || "").trim();

        const age =
        Number(data.age);

        const branch =
        String(data.branch || "").trim();

        const licenses =
        Array.isArray(data.licenses)
          ? data.licenses
          : [];


        // =========================
        // الحماية من البوت
        // =========================

        const website =
        String(data.website || "").trim();


        if (website) {

          return Response.json(
            {
              success:false,
              message:"طلب غير صالح."
            },
            {
              status:400
            }
          );

        }


        // =========================
        // التحقق من البيانات
        // =========================

        if (!name) {

          return Response.json(
            {
              success:false,
              message:"من فضلك اكتب الاسم بالكامل."
            },
            {
              status:400
            }
          );

        }


        if (
          !/^01[0125][0-9]{8}$/.test(phone)
        ) {

          return Response.json(
            {
              success:false,
              message:
              "من فضلك أدخل رقم هاتف مصري صحيح."
            },
            {
              status:400
            }
          );

        }


        if (!governorate) {

          return Response.json(
            {
              success:false,
              message:"من فضلك اختر المحافظة."
            },
            {
              status:400
            }
          );

        }


        if (
          !Number.isInteger(age) ||
          age < 5 ||
          age > 80
        ) {

          return Response.json(
            {
              success:false,
              message:"السن غير صحيح."
            },
            {
              status:400
            }
          );

        }


        if (
          branch !== "تجويد" &&
          branch !== "ترتيل"
        ) {

          return Response.json(
            {
              success:false,
              message:"من فضلك اختر فرع المسابقة."
            },
            {
              status:400
            }
          );

        }


        // =========================
        // TURNSTILE
        // =========================

        const turnstileToken =
        String(
          data.turnstileToken || ""
        ).trim();


        if (!turnstileToken) {

          return Response.json(
            {
              success:false,
              message:
              "من فضلك أكمل التحقق الأمني."
            },
            {
              status:400
            }
          );

        }


        const turnstileResponse =
        await fetch(
          "https://challenges.cloudflare.com/turnstile/v0/siteverify",
          {
            method:"POST",

            headers:{
              "Content-Type":
              "application/x-www-form-urlencoded"
            },

            body:
            new URLSearchParams({

              secret:
              env.TURNSTILE_SECRET,

              response:
              turnstileToken

            })
          }
        );


        const turnstileResult =
        await turnstileResponse.json();


        if (!turnstileResult.success) {

  const errors =
    turnstileResult["error-codes"] || [];

  console.error(
    "TURNSTILE ERROR:",
    JSON.stringify(errors)
  );

  return Response.json(
    {
      success: false,
      message:
        "فشل التحقق الأمني: " +
        (errors.length
          ? errors.join(", ")
          : "لم يتم استلام سبب الخطأ من Cloudflare")
    },
    {
      status: 403
    }
  );

}
        // =========================
        // منع التسجيل المكرر
        // =========================

        const existing =
        await env.DB
        .prepare(
          `
          SELECT registration_number
          FROM registrations
          WHERE phone = ?
          LIMIT 1
          `
        )
        .bind(phone)
        .first();


        if (existing) {

          return Response.json(
            {
              success:false,

              message:
              "هذا الرقم مسجل بالفعل في المسابقة. رقم التسجيل الخاص بك هو: " +
              existing.registration_number,

              registrationNumber:
              existing.registration_number
            },
            {
              status:409
            }
          );

        }


        // =========================
        // إنشاء رقم التسجيل
        // =========================

        const year =
        new Date()
        .getFullYear();


        const randomPart =
        crypto
        .randomUUID()
        .replace(/-/g,"")
        .substring(0,6)
        .toUpperCase();


        const registrationNumber =
        `SM-${year}-${randomPart}`;


        // =========================
        // حفظ التسجيل
        // =========================

        await env.DB
        .prepare(
          `
          INSERT INTO registrations
          (
            registration_number,
            name,
            phone,
            governorate,
            age,
            branch,
            licenses
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
          `
        )
        .bind(

          registrationNumber,

          name,

          phone,

          governorate,

          age,

          branch,

          JSON.stringify(licenses)

        )
        .run();


        // =========================
        // النجاح
        // =========================

        return Response.json({

          success:true,

          registrationNumber

        });


      } catch (error) {

        console.error(error);


        return Response.json(
          {
            success:false,
            message:
            "حدث خطأ أثناء حفظ التسجيل. من فضلك حاول مرة أخرى."
          },
          {
            status:500
          }
        );

      }

    }


    // =========================
    // ملفات الموقع
    // =========================

    const response =
    await env.ASSETS.fetch(request);


    const contentType =
    response.headers.get(
      "content-type"
    ) || "";


    if (
      contentType.includes("text/html")
    ) {

      let html =
      await response.text();


      /*
        لا نضيف كود الصوت هنا.

        الصوت موجود بالفعل داخل Index.html
        حتى لا يتم إنشاء مشغل صوت مكرر.
      */


      const headers =
      new Headers(
        response.headers
      );


      headers.set(
        "content-type",
        "text/html; charset=UTF-8"
      );


      return new Response(
        html,
        {
          status:
          response.status,

          statusText:
          response.statusText,

          headers
        }
      );

    }


    return response;

  }

};
