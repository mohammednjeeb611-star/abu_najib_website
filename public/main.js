(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('.site-header');
  const menu = document.getElementById('site-menu');
  const menuOpen = document.getElementById('menu-open');
  const menuClose = document.getElementById('menu-close');
  let lastFocused = null;
  let lenis = null;

  document.getElementById('current-year').textContent = new Date().getFullYear();

  const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 18);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  if (!reduceMotion && window.Lenis) {
    lenis = new window.Lenis({
      duration: 1.05,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.1
    });

    if (window.gsap) {
      if (window.ScrollTrigger) {
        window.gsap.registerPlugin(window.ScrollTrigger);
        lenis.on('scroll', window.ScrollTrigger.update);
      }
      window.gsap.ticker.add((time) => lenis.raf(time * 1000));
      window.gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time) => {
        lenis.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    }
  } else if (window.gsap && window.ScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);
  }

  const scrollToTarget = (target) => {
    if (target.id === 'top') {
      if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
      else window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      return;
    }
    if (lenis) {
      lenis.scrollTo(target, { offset: -78, duration: 1 });
    } else {
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }
  };

  const finishCloseMenu = (restoreFocus) => {
    menu.hidden = true;
    menu.style.opacity = '';
    document.body.classList.remove('menu-open');
    menuOpen.setAttribute('aria-expanded', 'false');
    if (lenis) lenis.start();
    if (restoreFocus && lastFocused) lastFocused.focus();
  };

  const closeMenu = (restoreFocus = true) => {
    if (menu.hidden) return;
    if (!reduceMotion && window.gsap) {
      window.gsap.to(menu, { opacity: 0, duration: 0.15, ease: 'power1.in', onComplete: () => finishCloseMenu(restoreFocus) });
    } else {
      finishCloseMenu(restoreFocus);
    }
  };

  const openMenu = () => {
    lastFocused = document.activeElement;
    menu.hidden = false;
    document.body.classList.add('menu-open');
    menuOpen.setAttribute('aria-expanded', 'true');
    if (lenis) lenis.stop();
    menuClose.focus();
    if (!reduceMotion && window.gsap) {
      window.gsap.fromTo(menu, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power1.out' });
      window.gsap.fromTo('.overlay-nav a', { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, stagger: 0.045, ease: 'power2.out', delay: 0.06 });
    }
  };

  menuOpen.addEventListener('click', openMenu);
  menuClose.addEventListener('click', () => closeMenu());
  menu.addEventListener('click', (event) => {
    if (event.target === menu) closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (menu.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...menu.querySelectorAll('a[href], button:not([disabled])')].filter((element) => element.offsetParent !== null);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const id = link.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      const fromMenu = menu.contains(link) && !menu.hidden;
      if (fromMenu) closeMenu(false);
      window.setTimeout(() => scrollToTarget(target), fromMenu && !reduceMotion ? 180 : 0);
      history.replaceState(null, '', id);
    });
  });

  const observedSections = [...document.querySelectorAll('#services, #work, #process, #faq')];
  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        document.querySelectorAll('.desktop-nav a').forEach((link) => {
          const active = link.getAttribute('href') === `#${entry.target.id}`;
          link.classList.toggle('is-active', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-18% 0px -65% 0px', threshold: 0 });
    observedSections.forEach((section) => sectionObserver.observe(section));
  }

  const copyButton = document.getElementById('copy-number');
  const copyStatus = document.getElementById('copy-status');
  const fallbackCopy = (text) => {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    return copied;
  };

  copyButton.addEventListener('click', async () => {
    const displayNumber = '+967 735 018 955';
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(displayNumber);
      else if (!fallbackCopy(displayNumber)) throw new Error('copy-failed');
      copyStatus.textContent = 'تم نسخ الرقم بنجاح.';
      copyButton.querySelector('span').textContent = 'تم النسخ';
    } catch {
      copyStatus.textContent = 'يمكنك تحديد الرقم ونسخه مباشرة.';
    }
    window.setTimeout(() => {
      copyStatus.textContent = '';
      copyButton.querySelector('span').textContent = 'نسخ الرقم';
    }, 3500);
  });

  const form = document.getElementById('whatsapp-form');
  const formStatus = document.getElementById('form-status');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      formStatus.textContent = 'يرجى إكمال الاسم ونوع المشروع أولاً.';
      return;
    }

    const name = document.getElementById('client-name').value.trim();
    const project = document.getElementById('project-type').value;
    const details = document.getElementById('project-details').value.trim();
    const message = [
      'مرحباً أبو نجيب،',
      `أنا ${name}، وأرغب في: ${project}.`,
      details ? `تفاصيل المشروع: ${details}` : 'أفضّل مناقشة تفاصيل المشروع معك في واتساب.'
    ].join('\n');
    const url = `https://wa.me/967735018955?text=${encodeURIComponent(message)}`;
    formStatus.textContent = 'تم تجهيز رسالتك، وسيُفتح واتساب الآن.';
    const popup = window.open(url, '_blank');
    if (popup) popup.opener = null;
    else window.location.assign(url);
  });

  if (!reduceMotion && window.gsap && window.ScrollTrigger) {
    window.gsap.to('[data-hero-parallax]', {
      yPercent: 9,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });

    document.querySelectorAll('[data-project-visual]').forEach((visual) => {
      window.gsap.from(visual, {
        scale: 0.95,
        opacity: 0.35,
        duration: 0.85,
        ease: 'power2.out',
        scrollTrigger: { trigger: visual, start: 'top 88%', once: true }
      });
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => window.ScrollTrigger.refresh());
    }
  }
})();
