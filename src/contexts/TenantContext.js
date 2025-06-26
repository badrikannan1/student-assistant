import React, { createContext, useState, useEffect, useContext } from 'react';

const TenantContext = createContext(null);

export const useTenant = () => useContext(TenantContext);

export const TenantProvider = ({ children }) => {
  const [tenantId, setTenantId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let finalTenantId = null;

    // 1. Try URL query parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const queryTenantId = urlParams.get('tenantId');

    if (queryTenantId) {
        finalTenantId = queryTenantId;
        console.log("Tenant ID Extracted from URL query:", finalTenantId);
    } else {
        // 2. Try subdomain extraction
        const hostnameParts = window.location.hostname.split('.');
        // Handles 'tenant.localhost' and 'tenant.domain.com'
        // For 'localhost' or 'domain.com' (no subdomain), tenantId will be null unless explicitly 'tenant.localhost'.
        if (hostnameParts.length > 1 && hostnameParts[0] !== 'www') {
            if (hostnameParts.length === 2 && hostnameParts[1] === 'localhost') { // e.g. harvard.localhost
                finalTenantId = hostnameParts[0];
            } else if (hostnameParts.length > 2) { // e.g. harvard.studentassistant.com
                finalTenantId = hostnameParts[0];
            }
            if (finalTenantId) {
                console.log("Tenant ID Extracted from subdomain:", finalTenantId);
            }
        }
    }

    if (!finalTenantId && window.location.hostname === 'localhost') {
        console.warn("Running on localhost without a tenant-specific subdomain (e.g. 'harvard.localhost') or 'tenantId' URL query parameter. No specific tenant ID extracted.");
    }
    setTenantId(finalTenantId);
    setLoading(false);
    console.log("TenantProvider finished initialization. Final Tenant ID set in context:", finalTenantId, "Loading state:", false);
  }, []);

  return (
    <TenantContext.Provider value={{ tenantId, loading }}>
      {console.log('TenantProvider: Rendering children -', children != null, 'Loading state:', loading)}
      {children} {/* Always render children; App.js handles the combined loading state */}
    </TenantContext.Provider>
  );
};
