// Listen for requests to the path.
export async function onRequest(context) {
    // Check if the request is a POST request.
    if (context.request.method !== "POST") {
        return new Response("Invalid request method.", { status: 405 });
    }

    // Get the form data.
    const formData = await context.request.formData();
    const body = Object.fromEntries(formData.entries());

    // Validate Turnstile captcha token (we'll use it later on for captcha).
    const captchaResult = await captchaCheck(context.request.headers, body, context.env.TURNSTILE_SECRET_KEY);

    if (!captchaResult) {
        return new Response("Ivalid captcha. Refresh page and try submitting it again.", { status: 422 });
    }

    // Send form data to my inbox.
    const sent = await sendFormToMe(body, context.env.DKIM_PRIVATE_KEY);

    if (!sent) {
        return new Response("Oops! Something went wrong. Please try submitting the form again.", { status: 500 });
    }

    return new Response("Form submitted successfully! 🚀", { status: 200 });
}

// Send email to my inbox (email with form data)
async function sendFormToMe(body, ENV) {
    const send_request = new Request("https://api.mailchannels.net/tx/v1/send", {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({
            personalizations: [
                {
                    to: [{ email: "me@yourdomain.com" }], // CHANGE THIS to your email address (emails will be sent TO this address).
                    dkim_domain: ENV.DOMAIN,
                    dkim_selector: ENV.DKIM_SELECTOR,
                    dkim_private_key: ENV.DKIM_PRIVATE_KEY,
                },
            ],
            from: {
                name: "Contact Form",
                email: "no-reply@yourdomain.com", // CHANGE THIS to your email address (emails will be sent FROM this address).
            },
            subject: "New contact form submission",
            content: [
                {
                    type: "text/plain",
                    value: `Name: ${body.name}\nEmail: ${body.email}\nMessage: ${body.message}`,
                },
            ],
        }),
    });

    // Get the response from the email API
    const send_response = await fetch(send_request);

    // Check if the email was sent successfully.
    if (!send_response.ok) {
        return false;
    }

    return true;
}

async function captchaCheck(headers, body, TURNSTILE_SECRET_KEY) {
    // Turnstile injects a token in "cf-turnstile-response".
    const token = body["cf-turnstile-response"];
    const ip = headers.get("CF-Connecting-IP");

    // Validate the token by calling the "/siteverify" API.
    let formData = new FormData();
    formData.append("secret", TURNSTILE_SECRET_KEY);
    formData.append("response", token);
    formData.append("remoteip", ip);

    const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        body: formData,
        method: "POST",
    });

    const outcome = await result.json();

    return outcome.success;
}