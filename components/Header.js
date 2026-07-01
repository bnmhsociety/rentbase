export default function Header({ agency }) {
  const phone = agency?.website_phone || agency?.phone;
  return (
    <header className="header">
      <div className="container header-inner">
        <a href={`/${agency?.website_slug || ""}`} className="brand">
          <div className="brand-logo">
            {agency?.profilePhotoUrl ? <img src={agency.profilePhotoUrl} alt={agency?.name || "Agence"} /> : "RB"}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="brand-name">{agency?.website_name || agency?.name || "RentBase"}</div>
            <div className="brand-sub">Location automobile</div>
          </div>
        </a>
        {phone ? <a className="btn btn-light" href={`tel:${phone}`}>Appeler</a> : null}
      </div>
    </header>
  );
}
