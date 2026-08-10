import { useState } from 'react';

// Shows a company's real favicon (guessed from its name), falling back to a
// coloured initial if the request fails. Shared by the applications table
// and the review queue candidate cards, so both show the same logo for the
// same company.
function CompanyLogo({ company }) {
  const [error, setError] = useState(false);
  const initial = (company || '?').charAt(0).toUpperCase();
  const domain = (company || '').toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
  const logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

  return (
    <div className={`avatar${error ? '' : ' has-logo'}`}>
      {error ? initial : <img src={logoUrl} alt="" onError={() => setError(true)} />}
    </div>
  );
}

export default CompanyLogo;
