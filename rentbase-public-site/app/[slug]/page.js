import { notFound } from "next/navigation";
import { signedPhotoUrl, supabaseFetch } from "../../lib/supabase";

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

export default async function AgencyPage({ params }) {
  const resolvedParams = await params;
  const slug = String(resolvedParams?.slug || "").toLowerCase();

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

                {waLink && (
                  <a
                    className="reserveBtn"
                    href={`${waLink}?text=${encodeURIComponent(`Bonjour, je souhaite réserver : ${vehicle.name || vehicle.brand || "un véhicule"}`)}`}
                    target="_blank"
                  >
                    Demander une réservation
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
