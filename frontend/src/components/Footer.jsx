import React from "react";
import { Link } from "react-router-dom";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer__container">
        <div className="footer__grid">
          <div className="footer__section">
            <h3 className="footer__title">Support</h3>
            <ul className="footer__list">
              <li><Link to="#">Help Center</Link></li>
              <li><Link to="#">AirCover</Link></li>
              <li><Link to="#">Anti-discrimination</Link></li>
              <li><Link to="#">Disability support</Link></li>
              <li><Link to="#">Cancellation options</Link></li>
              <li><Link to="#">Report neighborhood concern</Link></li>
            </ul>
          </div>

          <div className="footer__section">
            <h3 className="footer__title">Hosting</h3>
            <ul className="footer__list">
              <li><Link to="/register?role=HOST">Airbnb your home</Link></li>
              <li><Link to="#">AirCover for Hosts</Link></li>
              <li><Link to="#">Hosting resources</Link></li>
              <li><Link to="#">Community forum</Link></li>
              <li><Link to="#">Hosting responsibly</Link></li>
              <li><Link to="#">Airbnb-friendly apartments</Link></li>
            </ul>
          </div>

          <div className="footer__section">
            <h3 className="footer__title">Airbnb</h3>
            <ul className="footer__list">
              <li><Link to="#">Newsroom</Link></li>
              <li><Link to="#">New features</Link></li>
              <li><Link to="#">Careers</Link></li>
              <li><Link to="#">Investors</Link></li>
              <li><Link to="#">Gift cards</Link></li>
              <li><Link to="#">Airbnb.org emergency stays</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <div className="footer__left">
            <span>© 2026 Airbnb, Inc.</span>
            <span className="footer__dot">·</span>
            <Link to="#">Privacy</Link>
            <span className="footer__dot">·</span>
            <Link to="#">Terms</Link>
            <span className="footer__dot">·</span>
            <Link to="#">Sitemap</Link>
          </div>
          <div className="footer__right">
            <button className="footer__lang-btn">
              <svg viewBox="0 0 16 16" aria-hidden="true" role="presentation" style={{display: "block", height: "16px", width: "16px", fill: "currentColor"}}><path d="M8 .25a7.75 7.75 0 1 1 0 15.5A7.75 7.75 0 0 1 8 .25zm0 1.5a6.25 6.25 0 1 0 0 12.5A6.25 6.25 0 0 0 8 1.75zm2.596 3.634c.095-.085.24-.063.31.045l.03.057.793 1.851a.25.25 0 0 1-.06.278l-.05.037-1.318.793.36 2.519a.25.25 0 0 1-.154.264l-.062.015-1.75.25a.25.25 0 0 1-.28-.205l-.005-.063V9.25H6.414l-.793 2.125a.25.25 0 0 1-.293.155l-.06-.022-1.5-.75a.25.25 0 0 1-.133-.285l.026-.065.793-1.851V7.25a.25.25 0 0 1 .206-.246l.063-.004H5.5V5.75a.25.25 0 0 1 .193-.243L5.75 5.5h1a.25.25 0 0 1 .243.193L7 5.75V7h1.25V5.75a.25.25 0 0 1 .193-.243L8.5 5.5h.5l.053.007 1.543-.623z"></path></svg>
              <span>English (US)</span>
            </button>
            <button className="footer__currency-btn">
              <span>$</span>
              <span>USD</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
