import { notFound, redirect } from "next/navigation";
import { signedPhotoUrl, supabaseFetch, supabaseInsert } from "../../lib/supabase";

function money(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "Prix sur demande";
  return `${number.toLocaleString("fr-FR")}€ / jour`;
}

function phoneText(agency) {
  const prefix = agency.website_phone_prefix || "";
  const phone = agency.website_phone || agency.phone || "";
  return `${prefix} ${phone}`.trim();
}

function whatsappLink(agency) {
  const directLink = agency.website_whatsapp || "";
  if (directLink.startsWith("http")) return directLink;

  const phone = `${agency.website_phone_prefix || ""}${agency.website_phone || agency.phone || ""}`.replace(/[^0-9]/g, "");
  if (!phone) return null;

  return `https://wa.me/${phone}`;
}

function socialUrl(value) {
  if (!value) return null;
  if (value.startsWith("http")) return value;
  return `https://${value}`;
}

function cleanText(value) {
  return String(value || "").trim();
}

async function submitBookingRequest(formData) {
  "use server";

  const slug = cleanText(formData.get("slug"));
  const agencyId = cleanText(formData.get("agency_id"));
  const vehicleId = cleanText(formData.get("vehicle_id"));
  const firstName = cleanText(formData.get("first_name"));
  const lastName = cleanText(formData.get("last_name"));
  const phone = cleanText(formData.get("phone"));
  const email = cleanText(formData.get("email"));
  const startDate = cleanText(formData.get("start_date"));
  const endDate = cleanText(formData.get("end_date"));
  const startHour = cleanText(formData.get("start_hour"));
  const endHour = cleanText(formData.get("end_hour"));
  const message = cleanText(formData.get("message"));

  if (!slug || !agencyId || !vehicleId || !firstName || !phone) {
    redirect(`/${slug || ""}?demande=erreur`);
  }

  await supabaseInsert(
    "/rest/v1/booking_requests",
    {
      agency_id: agencyId,
      vehicle_id: vehicleId,
      first_name: firstName,
      last_name: lastName || null,
      phone,
      email: email || null,
      start_date: startDate || null,
      end_date: endDate || null,
      start_hour: startHour || null,
      end_hour: endHour || null,
      message: message || null,
      status: "Nouvelle",
    },
    { service: true }
  );

  redirect(`/${slug}?demande=envoyee`);
}

export default async function AgencyPage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const slug = String(resolvedParams?.slug || "").toLowerCase();
  const demandeStatus = String(resolvedSearchParams?.demande || "");

  const agencies = await supabaseFetch(
    `/rest/v1/agencies?website_slug=eq.${encodeURIComponent(slug)}&select=id,name,email,phone,address,city,website_name,website_slug,website_phone_prefix,website_phone,website_intro,website_whatsapp,website_snapchat,website_tiktok,website_instagram,website_profile_photo_path&limit=1`,
    { service: true }
  );

  const agency = agencies?.[0];
  if (!agency) notFound();

  const vehicles = await supabaseFetch(
    `/rest/v1/vehicles?agency_id=eq.${agency.id}&status=eq.Disponible&select=id,name,brand,model,category,status,price_per_day,deposit_amount,mileage,fuel,gearbox,seats,power,year,color,description,main_photo_path,photo_url&order=created_at.desc`,
    { service: true }
  );

  const profilePhoto = await signedPhotoUrl(agency.website_profile_photo_path);

  const vehiclesWithPhotos = await Promise.all(
    (vehicles || []).map(async (vehicle) => ({
      ...vehicle,
      image: await signedPhotoUrl(vehicle.main_photo_path || vehicle.photo_url),
    }))
  );

  const displayName = agency.website_name || agency.name || "Agence de location";
  const intro = agency.website_intro || "Découvrez nos véhicules disponibles et contactez-nous pour réserver.";
  const contactPhone = phoneText(agency);
  const waLink = whatsappLink(agency);

  return (
    <main className="page">
      <section className="hero">
        <div className="heroTop">
          <div className="agencyIdentity">
            <div className="logoBox">
              {profilePhoto ? (
                <img src={profilePhoto} alt={displayName} />
              ) : (
                <span>{displayName.slice(0, 1).toUpperCase()}</span>
              )}
            </div>

            <div>
              <p className="eyebrow">Location automobile</p>
              <h1>{displayName}</h1>
            </div>
          </div>
        </div>

        <p className="intro">{intro}</p>

        <div className="heroActions">
          {waLink && (
            <a className="primaryBtn" href={waLink} target="_blank">
              Réserver sur WhatsApp
            </a>
          )}

          {contactPhone && <a className="secondaryBtn" href={`tel:${contactPhone.replace(/\s/g, "")}`}>{contactPhone}</a>}
        </div>

        <div className="socials">
          {socialUrl(agency.website_instagram) && <a href={socialUrl(agency.website_instagram)} target="_blank">Instagram</a>}
          {socialUrl(agency.website_snapchat) && <a href={socialUrl(agency.website_snapchat)} target="_blank">Snapchat</a>}
          {socialUrl(agency.website_tiktok) && <a href={socialUrl(agency.website_tiktok)} target="_blank">TikTok</a>}
        </div>
      </section>

      {demandeStatus === "envoyee" && (
        <section className="successBox">
          <strong>Demande envoyée.</strong>
          <p>L’agence a bien reçu votre demande de réservation.</p>
        </section>
      )}

      {demandeStatus === "erreur" && (
        <section className="errorBox">
          <strong>Demande non envoyée.</strong>
          <p>Merci de remplir au minimum votre prénom et votre téléphone.</p>
        </section>
      )}

      <section className="sectionTitle">
        <h2>Véhicules disponibles</h2>
        <p>{vehiclesWithPhotos.length} véhicule(s) disponible(s)</p>
      </section>

      {vehiclesWithPhotos.length === 0 ? (
        <section className="emptyBox">
          <h3>Aucun véhicule disponible</h3>
          <p>Contactez l’agence pour connaître les prochaines disponibilités.</p>
        </section>
      ) : (
        <section className="vehicleGrid">
          {vehiclesWithPhotos.map((vehicle) => (
            <article className="vehicleCard" key={vehicle.id}>
              <div className="vehicleImage">
                {vehicle.image ? (
                  <img src={vehicle.image} alt={vehicle.name || "Véhicule"} />
                ) : (
                  <div className="imagePlaceholder">RENTBASE</div>
                )}
              </div>

              <div className="vehicleContent">
                <div className="vehicleHead">
                  <div>
                    <h3>{vehicle.name || `${vehicle.brand || ""} ${vehicle.model || ""}`}</h3>
                    <p>{[vehicle.category, vehicle.year, vehicle.gearbox].filter(Boolean).join(" · ")}</p>
                  </div>
                  <strong>{money(vehicle.price_per_day)}</strong>
                </div>

                <div className="tags">
                  {vehicle.fuel && <span>{vehicle.fuel}</span>}
                  {vehicle.seats && <span>{vehicle.seats} places</span>}
                  {vehicle.power && <span>{vehicle.power}</span>}
                  {vehicle.deposit_amount ? <span>Caution {vehicle.deposit_amount}€</span> : null}
                </div>

                {vehicle.description && <p className="description">{vehicle.description}</p>}

                <form action={submitBookingRequest} className="requestForm">
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="agency_id" value={agency.id} />
                  <input type="hidden" name="vehicle_id" value={vehicle.id} />

                  <div className="formTitle">Demander ce véhicule</div>

                  <div className="formGrid">
                    <input name="first_name" placeholder="Prénom *" required />
                    <input name="last_name" placeholder="Nom" />
                    <input name="phone" placeholder="Téléphone *" required />
                    <input name="email" placeholder="Email" type="email" />
                    <input name="start_date" type="date" />
                    <input name="end_date" type="date" />
                    <input name="start_hour" type="time" />
                    <input name="end_hour" type="time" />
                  </div>

                  <textarea
                    name="message"
                    placeholder={`Message : je souhaite réserver ${vehicle.name || vehicle.brand || "ce véhicule"}`}
                    rows="3"
                  />

                  <button className="reserveBtn" type="submit">
                    Envoyer ma demande
                  </button>
                </form>

                {waLink && (
                  <a
                    className="whatsappSmall"
                    href={`${waLink}?text=${encodeURIComponent(`Bonjour, je souhaite réserver : ${vehicle.name || vehicle.brand || "un véhicule"}`)}`}
                    target="_blank"
                  >
                    Ou contacter sur WhatsApp
                  </a>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      <footer className="footer">
        <strong>RENT<span>BASE</span></strong>
        <p>Page générée automatiquement pour {displayName}</p>
      </footer>
    </main>
  );
}
