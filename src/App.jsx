import React, { useEffect, useRef, useState } from 'react';
import { animate, inView, stagger } from "motion";

// --- NEW DATA FOR CINEMATIC THEME ---
const projects = [
  { id: 1, title: 'The Obsidian', category: 'New York', imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb' },
  { id: 2, title: 'Monochrome Loft', category: 'London', imageUrl: 'https://images.unsplash.com/photo-1588854337236-6889d6085cd6?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb' },
  { id: 3, title: 'Villa Noir', category: 'Dubai', imageUrl: 'https://images.unsplash.com/photo-1616047006789-b7af5afb8c20?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb' },
  { id: 4, title: 'The Chamberlain', category: 'Los Angeles', imageUrl: 'https://images.unsplash.com/photo-1617104679233-a73c444811a2?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb' },
  { id: 5, title: 'Kyoto Residence', category: 'Japan', imageUrl: 'https://images.unsplash.com/photo-1615875617238-25a85283c3a4?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb' },
];

// --- COMPONENTS ---

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-container">
        <a href="#home" className="nav-logo">OMKAR</a>
        <ul className="nav-menu">
          <li><a href="#about">About</a></li>
          <li><a href="#process">Process</a></li>
          <li><a href="#portfolio">Portfolio</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
      </div>
    </nav>
  );
};

const Hero = () => {
  const titleRef = useRef(null);

  useEffect(() => {
    animate(
      titleRef.current,
      { y: [30, 0], opacity: [0, 1] },
      { duration: 1, easing: "ease-out", delay: 0.5 }
    );
  }, []);

  return (
    <section id="home" className="hero-container">
      <h1 ref={titleRef} className="hero-title">Crafting Atmospheric Spaces</h1>
    </section>
  );
};

const About = () => {
  const sectionRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    inView(section, () => {
      animate(
        section.querySelectorAll(".about-content > *, .about-image"),
        { opacity: [0, 1], y: [20, 0] },
        { delay: stagger(0.2), duration: 0.8 }
      );
    }, { amount: 0.4 });
  }, []);

  return (
    <section id="about" className="section" ref={sectionRef}>
      <div className="container about-container">
        <div className="about-content">
          <h2 className="section-title">We design emotive interiors that tell a story.</h2>
          <p>At Omkar, we believe that true luxury lies in the details. Our approach is holistic and deeply personal, focusing on creating spaces that are not only visually stunning but also profoundly resonant. We blend bold architectural elements with bespoke furnishings and curated art to build immersive environments.</p>
          <a href="#contact" className="cta-link">Begin Your Project</a>
        </div>
        <div className="about-image">
          <img src="https://images.unsplash.com/photo-1615529182902-92430932188a?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb" alt="Minimalist dark interior design" />
        </div>
      </div>
    </section>
  );
};

const Process = () => {
  const sectionRef = useRef(null);
  useEffect(() => {
    inView(sectionRef.current, () => {
      animate(
        sectionRef.current.querySelectorAll(".process-item"),
        { opacity: [0, 1], y: [20, 0] },
        { delay: stagger(0.2), duration: 0.8 }
      );
    }, { amount: 0.4 });
  }, []);

  return (
    <section id="process" className="section process-section" ref={sectionRef}>
      <div className="container">
        <h2 className="section-title">Our Method</h2>
        <div className="process-grid">
          <div className="process-item">
            <div className="number">01</div>
            <h3>Consultation</h3>
            <p>We begin with a deep dive into your vision, lifestyle, and aspirations for the space.</p>
          </div>
          <div className="process-item">
            <div className="number">02</div>
            <h3>Conceptual Design</h3>
            <p>Our team develops a comprehensive design concept with mood boards and 3D renderings.</p>
          </div>
          <div className="process-item">
            <div className="number">03</div>
            <h3>Execution</h3>
            <p>We manage every aspect of the project, from procurement to final installation, ensuring a seamless result.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

const Portfolio = () => {
  const sectionRef = useRef(null);
  useEffect(() => {
    inView(sectionRef.current, () => {
      animate(
        sectionRef.current.querySelectorAll(".project-card"),
        { opacity: [0, 1], scale: [0.98, 1] },
        { delay: stagger(0.15), duration: 0.8 }
      );
    }, { amount: 0.2 });
  }, []);

  return (
    <section id="portfolio" className="section" ref={sectionRef}>
      <div className="container">
        <h2 className="section-title" style={{ textAlign: 'center' }}>Featured Projects</h2>
        <div className="portfolio-grid">
          {projects.map((project) => (
            <div key={project.id} className="project-card">
              <img src={project.imageUrl} alt={project.title} className="project-image" />
              <div className="project-overlay">
                <h3 className="project-title">{project.title}</h3>
                <p className="project-category">{project.category}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Contact = () => {
  const sectionRef = useRef(null);
  useEffect(() => {
    inView(sectionRef.current, () => {
      animate(
        sectionRef.current.querySelectorAll(".section-title, p, .form-group, .submit-button"),
        { opacity: [0, 1], y: [20, 0] },
        { delay: stagger(0.1), duration: 0.8 }
      );
    }, { amount: 0.3 });
  }, []);

  return (
    <section id="contact" className="section contact-section" ref={sectionRef}>
      <div className="container contact-container">
        <h2 className="section-title">Contact Us</h2>
        <p>Let's discuss how we can bring your vision to life. Fill out the form below to schedule a private consultation.</p>
        <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
          <div className="form-group">
            <input type="text" id="name" name="name" placeholder="Name" required />
          </div>
          <div className="form-group">
            <input type="email" id="email" name="email" placeholder="Email" required />
          </div>
          <div className="form-group full-width">
            <textarea id="message" name="message" rows="3" placeholder="Tell us about your project..." required></textarea>
          </div>
          <button type="submit" className="submit-button">Submit Inquiry</button>
        </form>
      </div>
    </section>
  );
};

const Footer = () => (
  <footer className="footer">
    <div className="container footer-container">
      <p>&copy; {new Date().getFullYear()} Omkar Interiors</p>
      <div className="footer-social">
        <a href="https://www.instagram.com/omkar_interiorss/" target="_blank" rel="noopener noreferrer">Instagram</a>
        <a href="#">Pinterest</a>
        <a href="#">Facebook</a>
      </div>
    </div>
  </footer>
);

// --- MAIN APP ---
function App() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Process />
        <Portfolio />
        <Contact />
      </main>
      <Footer />
    </>
  );
}

export default App;