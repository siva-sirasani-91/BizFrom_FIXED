import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Combined Global Fetch Interceptor to automatically add Authorization headers/sessions and handle token synchronization
if (typeof window !== "undefined" && window.fetch) {
  const originalFetch = window.fetch;
  
  const customFetch = async function (this: any, input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    
    // 1. Retrieve session token
    let token = localStorage.getItem("bizform_session_token") || "";
    if (!token) {
      const cached = localStorage.getItem("bizform_user_session");
      if (cached) {
        try {
          const u = JSON.parse(cached);
          token = u ? (u.token || "") : "";
        } catch (e) {
          // Ignored
        }
      }
    }

    // 2. Inject token headers if secure API call
    if (token && url.includes("/api/")) {
      init = init || {};
      if (!init.headers) {
        init.headers = {};
      }

      if (init.headers instanceof Headers) {
        if (!init.headers.has("Authorization")) {
          init.headers.set("Authorization", `Bearer ${token}`);
        }
        if (!init.headers.has("x-session-token")) {
          init.headers.set("x-session-token", token);
        }
      } else if (Array.isArray(init.headers)) {
        const hasAuth = init.headers.some(([k]) => k.toLowerCase() === "authorization");
        if (!hasAuth) {
          init.headers.push(["Authorization", `Bearer ${token}`]);
        }
        const hasSession = init.headers.some(([k]) => k.toLowerCase() === "x-session-token");
        if (!hasSession) {
          init.headers.push(["x-session-token", token]);
        }
      } else {
        // Plain object representation
        const headersObj = init.headers as Record<string, string>;
        const hasAuth = Object.keys(headersObj).some(k => k.toLowerCase() === "authorization");
        const hasSession = Object.keys(headersObj).some(k => k.toLowerCase() === "x-session-token");

        init.headers = {
          ...headersObj,
          ...(hasAuth ? {} : { "Authorization": `Bearer ${token}` }),
          ...(hasSession ? {} : { "x-session-token": token })
        };
      }
    }

    try {
      const response = await originalFetch.call(this || window, input, init);
      
      // 3. Handle 401 unauthorized
      if (response.status === 401) {
        if (!url.includes("/api/auth/login") && !url.includes("/api/auth/validate-session")) {
          window.dispatchEvent(new Event("unauthorized"));
        }
      }

      // 4. Extract token if successful API response
      if (response.status >= 200 && response.status < 300 && url.includes("/api/")) {
        try {
          const clonedResponse = response.clone();
          clonedResponse.json().then(data => {
            if (data) {
              if (data.user && data.user.token) {
                localStorage.setItem("bizform_session_token", data.user.token);
              } else if (data.token) {
                localStorage.setItem("bizform_session_token", data.token);
              }
            }
          }).catch(() => {});
        } catch (e) {}
      }

      return response;
    } catch (err) {
      throw err;
    }
  };

  try {
    Object.defineProperty(window, 'fetch', {
      value: customFetch,
      configurable: true,
      writable: true,
      enumerable: true
    });
  } catch (err) {
    console.warn("Direct own-property Object.defineProperty on window.fetch failed. Attempting prototype defineProperty fallback.", err);
    try {
      Object.defineProperty(Object.getPrototypeOf(window), 'fetch', {
        value: customFetch,
        configurable: true,
        writable: true,
        enumerable: true
      });
    } catch (errProto) {
      console.error("Critical: Failed to patch fetch interceptor on window or prototype.", errProto);
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
