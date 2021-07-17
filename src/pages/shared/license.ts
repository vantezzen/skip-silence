/**
 * Verify License for Skip Silence Plus
 * 
 * @param license License Key from Gumroad
 * @param increase_count Should this verification increase the count of uses?
 * @returns True if valid
 */
export default async function verifyLicense(license : string, increase_count = false) : Promise<boolean> {
  let formData = new FormData();
  formData.append('product_permalink', 'PkZjU');
  formData.append('license_key', license);
  formData.append('increment_uses_count', String(increase_count));

  try {
    const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      body: formData
    });
    const data = await response.json();

    if (data && data.uses < 100) {
      return true;
    }
  } catch(e) {}
  return false;
}
