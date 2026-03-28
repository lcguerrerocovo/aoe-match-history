import React from 'react';
import { mount } from '@cypress/react';
import { MemoryRouter } from 'react-router-dom';
import { CustomThemeProvider } from '../theme/ThemeProvider';
import TopBar from './TopBar';

const mountWithChakra = (children: React.ReactNode, initialRoute = '/') => {
  mount(
    <MemoryRouter initialEntries={[initialRoute]}>
      <CustomThemeProvider>{children}</CustomThemeProvider>
    </MemoryRouter>
  );
};

describe('TopBar responsiveness', () => {
  it('renders correctly on desktop', () => {
    cy.viewport(1280, 800);
    mountWithChakra(<TopBar />);
    cy.get('[data-testid="topbar-root"]').should('be.visible');
    cy.get('[data-testid="topbar-root"]').should('have.css', 'background-image').and('include', 'linear-gradient');
    cy.get('[data-testid="topbar-root"]').should('have.css', 'border-bottom');
  });

  it('renders correctly on mobile', () => {
    cy.viewport(375, 667);
    mountWithChakra(<TopBar />);
    cy.get('[data-testid="topbar-root"]').should('be.visible');
    cy.get('[data-testid="topbar-root"]').should('have.css', 'background-image').and('include', 'linear-gradient');
    cy.get('[data-testid="topbar-root"]').should('have.css', 'border-bottom');
  });

  it('adapts layout between mobile and desktop', () => {
    cy.viewport(375, 667);
    mountWithChakra(<TopBar />);
    cy.get('[data-testid="topbar-root"]').invoke('css', 'border-radius').should('eq', '0px');
    cy.viewport(1280, 800);
    cy.get('[data-testid="topbar-root"]').invoke('css', 'border-radius').should('eq', '0px');
  });

  it('shows correct layout on desktop - title left, search right, toggle far right', () => {
    cy.viewport(1280, 800);
    mountWithChakra(<TopBar />);
    
    // Desktop layout should be visible
    cy.get('[data-testid="desktop-layout"]').should('be.visible');
    cy.get('[data-testid="desktop-title"]').should('be.visible');
    cy.get('[data-testid="desktop-toggle"]').should('be.visible');
    cy.get('input[placeholder="Search players..."]').should('be.visible');
    
    // Verify positioning: title and search should be in same horizontal container
    cy.get('[data-testid="desktop-title"]').then($title => {
      cy.get('input[placeholder="Search players..."]').then($search => {
        // Both should be roughly at same vertical level (within 50px tolerance)
        const titleTop = $title.offset()?.top || 0;
        const searchTop = $search.offset()?.top || 0;
        expect(Math.abs(titleTop - searchTop)).to.be.lessThan(50);
      });
    });
  });

  it('shows correct layout on mobile - title centered, toggle same level, search below', () => {
    cy.viewport(375, 667);
    mountWithChakra(<TopBar />);
    
    // Mobile layout should be visible
    cy.get('[data-testid="mobile-layout"]').should('be.visible');
    cy.get('[data-testid="mobile-title"]').should('be.visible');
    cy.get('[data-testid="mobile-toggle"]').should('be.visible');
    cy.get('[data-testid="mobile-search"]').should('be.visible');
    
    // Verify search is below title (different vertical positions)
    cy.get('[data-testid="mobile-title"]').then($title => {
      cy.get('[data-testid="mobile-search"] input').then($search => {
        const titleTop = $title.offset()?.top || 0;
        const searchTop = $search.offset()?.top || 0;
        // Search should be below title (at least 40px difference)
        expect(searchTop - titleTop).to.be.greaterThan(40);
      });
    });
    
    // Verify title and toggle are at same level
    cy.get('[data-testid="mobile-title"]').then($title => {
      cy.get('[data-testid="mobile-toggle"] button').then($toggle => {
        const titleTop = $title.offset()?.top || 0;
        const toggleTop = $toggle.offset()?.top || 0;
        // Title and toggle should be at roughly same level (within 20px tolerance)
        expect(Math.abs(titleTop - toggleTop)).to.be.lessThan(20);
      });
    });
  });

  it('shows mobile nav row with Live link', () => {
    cy.viewport(375, 667);
    mountWithChakra(<TopBar />);

    // Nav row should exist with a Live link pointing to /live
    cy.get('[data-testid="mobile-nav"]').should('be.visible');
    cy.get('[data-testid="mobile-nav"]').contains('a', 'Live')
      .should('be.visible')
      .and('have.attr', 'href', '/live');
  });

  it('shows active state on Live nav link when on /live route', () => {
    cy.viewport(375, 667);
    mountWithChakra(<TopBar />, '/live');

    cy.get('[data-testid="mobile-nav"]').contains('a', 'Live').then($link => {
      const opacity = parseFloat($link.css('opacity'));
      expect(opacity).to.eq(1);
      // Active link should have a visible (non-transparent) bottom border
      const borderColor = $link.css('border-bottom-color');
      expect(borderColor).to.not.eq('rgba(0, 0, 0, 0)');
    });
  });

  it('shows inactive state on Live nav link when on other routes', () => {
    cy.viewport(375, 667);
    mountWithChakra(<TopBar />, '/');

    cy.get('[data-testid="mobile-nav"]').contains('a', 'Live').then($link => {
      const opacity = parseFloat($link.css('opacity'));
      expect(opacity).to.be.lessThan(1);
    });
  });

  it('hides mobile nav row on desktop', () => {
    cy.viewport(1280, 800);
    mountWithChakra(<TopBar />, '/live');

    cy.get('[data-testid="mobile-nav"]').should('not.be.visible');
  });

  it('maintains responsive behavior when switching viewports', () => {
    mountWithChakra(<TopBar />);
    
    // Start mobile
    cy.viewport(375, 667);
    cy.get('[data-testid="mobile-title"]').should('be.visible');
    cy.get('[data-testid="mobile-search"]').should('be.visible');
    cy.get('[data-testid="desktop-layout"]').should('not.be.visible'); 
    
    // Switch to desktop
    cy.viewport(1280, 800);
    cy.get('[data-testid="desktop-title"]').should('be.visible');
    cy.get('[data-testid="desktop-toggle"]').should('be.visible');
    cy.get('[data-testid="mobile-layout"]').should('not.be.visible');
    
    // Switch back to mobile
    cy.viewport(375, 667);
    cy.get('[data-testid="mobile-title"]').should('be.visible');
    cy.get('[data-testid="mobile-search"]').should('be.visible');
    cy.get('[data-testid="desktop-layout"]').should('not.be.visible');
  });
}); 