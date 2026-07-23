import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Camera, CircleDollarSign, Move3d, Plane, ShieldCheck } from "lucide-react";
import { PropertyMediaPanorama } from "@/components/property-media-panorama";

const money = (amount) => `₦${new Intl.NumberFormat("en-NG").format(amount)}`;

export function PropertyMediaHome({ configuration }) {
  const price = (id) => configuration.pricing.packages.find((item) => item.id === id)?.priceNgn || 0;
  return (
    <>
      <section className="section property-media-home" aria-labelledby="property-media-home-heading">
        <div className="shell property-media-home__grid">
          <div className="property-media-home__copy">
            <p className="eyebrow"><Camera size={17} />Nestora Property Media</p>
            <h2 id="property-media-home-heading">Show every property at its best.</h2>
            <p>Professional photography, cinematic drone footage and immersive 360° tours created for listings, developments and hospitality brands.</p>
            <div className="property-media-home__actions">
              <Link className="button button--coral" href="/services/property-media#booking">Book a property shoot <ArrowRight size={17} /></Link>
              <Link className="button button--light" href="/services/property-media#pricing">View packages and pricing</Link>
            </div>
            <dl className="property-media-home__prices">
              <div><dt>Photography</dt><dd>from {money(price("essential-photography"))}</dd></div>
              <div><dt>360° tours</dt><dd>from {money(price("virtual-tour"))}</dd></div>
              <div><dt>Drone photography</dt><dd>from {money(price("drone-photography"))}</dd></div>
              <div><dt>Complete media</dt><dd>from {money(price("complete-property-media"))}</dd></div>
            </dl>
            <Link className="property-media-home__pricing-link" href="/services/property-media#pricing"><CircleDollarSign size={17} />See every package and cost <ArrowRight size={16} /></Link>
          </div>
          <div className="property-media-home__visual">
            <Image src={configuration.serviceMedia.team.src} alt={configuration.serviceMedia.team.alt} fill sizes="(max-width: 850px) 100vw, 52vw" />
            <span>Illustrative launch imagery · replaceable by administrators</span>
            <div><strong><ShieldCheck size={17} />Professional production</strong><small>Photography · 360° · drone · walkthroughs</small></div>
          </div>
        </div>
      </section>

      <section className="section shell home-media-tour" id="property-media-360">
        <div className="home-media-tour__heading">
          <div><p className="eyebrow"><Move3d size={17} />Immersive 360°</p><h2>Step inside before scheduling a visit.</h2></div>
          <div><p>Explore rooms, finishes, layouts and views from anywhere. This demonstration loads the full WebGL experience only when you choose to interact.</p><Link href="/services/property-media#booking">Book a 360° property shoot <ArrowRight size={16} /></Link></div>
        </div>
        <PropertyMediaPanorama compact />
      </section>

      <section className="section home-drone">
        <Image src={configuration.serviceMedia.drone.src} alt={configuration.serviceMedia.drone.alt} fill sizes="100vw" />
        <span className="home-drone__veil" />
        <div className="shell home-drone__content">
          <p className="eyebrow"><Plane size={17} />Aerial property media</p>
          <h2>Aerial views that reveal the full value of a property.</h2>
          <p>Standard photography shows the property. Drone coverage shows its scale, surroundings, access and location advantage.</p>
          <ul><li>Aerial still photography</li><li>Short reveal videos</li><li>Development flyovers</li><li>Construction progress</li></ul>
          <small>Availability is subject to location, weather, airspace restrictions, safety assessment and required permissions.</small>
          <Link className="button button--light" href="/services/property-media#drone">Explore drone services <ArrowRight size={17} /></Link>
        </div>
      </section>
    </>
  );
}
