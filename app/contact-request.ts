import * as log from "https://deno.land/std@0.203.0/log/mod.ts";
import { load } from "https://deno.land/std@0.203.0/dotenv/mod.ts";
import { existsSync } from "https://deno.land/std@0.203.0/fs/mod.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { response, getJson, writeJson } from "./helpers.ts";

export async function sendContactEmails(
  name: string,
  email: string,
  message: string
): Promise<Response> {
  log.debug("sendContactEmails()");
  log.debug({ name });
  log.debug({ email });
  log.debug({ message });

  // EMAIL SANITY CHECK

  if (!email) {
    return response(400, { error: "no email" });
  }
  const regex = /^\S+@\S+\.\S+$/g;
  const emailIsSane = regex.test(email);
  if (!emailIsSane) {
    return response(400, { error: "insane email" });
  }

  // GET AND INCREMENT THE COUNTER

  const path1: string = "./data/metrics.json";
  const metrics: any = (await existsSync(path1))
    ? await getJson(path1)
    : { contactCount: 0, registrationCount: 0 };
  log.debug({ metrics });
  const count: number = metrics.contactCount + 1;
  log.debug({ count });
  metrics.contactCount = count;
  await writeJson(path1, metrics);

  // STORE THE REQUEST

  const path2: string = "./data/contact-requests.json";
  const contactRequests: any = (await existsSync(path2))
    ? await getJson(path2)
    : [];
  contactRequests.push({
    id: count,
    date: new Date(),
    name,
    email,
    message,
  });
  await writeJson(path2, contactRequests);
  // LOAD SECRETS

  await load({ export: true });

  // PREPARE SMTP

  const client = new SMTPClient({
    connection: {
      hostname: "smtp.sendgrid.net",
      port: 465,
      tls: true,
      auth: {
        username: "apikey",
        password: Deno.env.get("SENDGRID_APIKEY"),
      },
    },
  });

  // EMAIL THE DATA TO POELSTRA

  await client.send({
    from: "Jan Werkhoven <jw@floatplane.dev>",
    to: "Team Poelstra <fpoelstrahuisarts@hotmail.com>",
    bcc: "Jan Werkhoven <jw@floatplane.dev>",
    subject: `Website contactverzoek #${count}`,
    content: "auto",
    html: `
      <p>Beste team Poelstra,</p>
      <p>Een bezoeker heeft op <a href="https://huisartspoelstra.nl">huisartspoelstra.nl</a> zonet jullie contactformulier ingevuld met de volgende gegevens:</p>
      <ul>
        <li>Naam: ${name}</li>
        <li>Email: <a href="mailto:${email}" target="_blank">${email}</a></li>
        <li>Bericht: ${message}</li>
        <li>ID: #${count}</li>
      </ul>
      <p>Gelieve deze persoon spoedig te beantwoorden.</p>
      <p>Met vriendelijke groet</p>
      <p>Jan Werkhoven
      <br>Jullie Web Developer
      <br><a href="mailto:jw@floatplane.dev" target="_blank">jw@floatplane.dev</a>
      <br><a href="https://floatplane.dev" target="_blank">Floatplane Dev</a>
      </p>
    `,
  });

  await client.close();

  return response(200, { success: true });
}
