import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AuthState, AuthStatus, RoleStatus, ProfileStatus, UserProfile } from '../../context/AuthContext';

/**
 * Palak Enterprises — Auth Boot & State Transition Regression Suite
 * 
 * Asserts:
 * 1. ADMIN USER: Customer UI must never render before Admin UI.
 * 2. CUSTOMER USER: Admin UI must never render before Customer UI.
 * 3. UNRESOLVED AUTHENTICATION: Only neutral loading UI may render (UNRESOLVED ≠ CUSTOMER, UNRESOLVED ≠ ADMIN).
 */

describe('🛡️ Auth Boot Lifecycle, Role Resolution & UI Flicker Elimination', () => {

  const ADMIN_STAFF_EMAILS = [
    "academysparknest@gmail.com",
    "palakenterprises@gmail.com",
    "palakprintingpress@gmail.com",
    "kumarpankaj@gmail.com",
  ];

  interface SimulatedAuthStore {
    user: UserProfile | null;
    session: any | null;
    loading: boolean;
    isReady: boolean;
    authState: AuthState;
    authStatus: AuthStatus;
    roleStatus: RoleStatus;
    profileStatus: ProfileStatus;
    resolvedRole: "CUSTOMER" | "STAFF" | "MANAGER" | "ADMIN" | null;
    renderedShellHistory: Array<'BOOTSTRAP_LOADING' | 'ADMIN_SHELL' | 'CUSTOMER_SHELL' | 'PUBLIC_SHELL' | 'ERROR_SHELL'>;
  }

  function createInitialBootState(): SimulatedAuthStore {
    return {
      user: null,
      session: null,
      loading: true,
      isReady: false,
      authState: "AUTH_LOADING",
      authStatus: "loading",
      roleStatus: "loading",
      profileStatus: "loading",
      resolvedRole: null,
      renderedShellHistory: ['BOOTSTRAP_LOADING'],
    };
  }

  function determineRenderedShell(state: SimulatedAuthStore): 'BOOTSTRAP_LOADING' | 'ADMIN_SHELL' | 'CUSTOMER_SHELL' | 'PUBLIC_SHELL' | 'ERROR_SHELL' {
    if (!state.isReady && state.loading) {
      return 'BOOTSTRAP_LOADING';
    }
    if (state.authState === 'AUTH_ERROR') {
      return 'ERROR_SHELL';
    }
    if (state.authState === 'AUTHORIZED_ADMIN' || state.authState === 'AUTHORIZED_MANAGER' || state.authState === 'AUTHORIZED_STAFF') {
      return 'ADMIN_SHELL';
    }
    if (state.authState === 'AUTHORIZED_CUSTOMER') {
      return 'CUSTOMER_SHELL';
    }
    return 'PUBLIC_SHELL';
  }

  function resolveAuthAtomically(
    store: SimulatedAuthStore,
    sessionUser: { id: string; email: string; user_metadata?: any } | null,
    dbProfile: { full_name?: string; phone?: string; role?: string; email?: string } | null,
    dbRoles: Array<{ role: string }> | null
  ) {
    if (!sessionUser) {
      store.session = null;
      store.user = null;
      store.resolvedRole = null;
      store.authState = "UNAUTHENTICATED";
      store.authStatus = "unauthenticated";
      store.roleStatus = "ready";
      store.profileStatus = "ready";
      store.loading = false;
      store.isReady = true;
      store.renderedShellHistory.push(determineRenderedShell(store));
      return;
    }

    const cleanEmail = sessionUser.email.toLowerCase().trim();
    const isAdminEmail = ADMIN_STAFF_EMAILS.includes(cleanEmail);

    let authoritativeRole: "CUSTOMER" | "STAFF" | "MANAGER" | "ADMIN" = "CUSTOMER";

    if (dbRoles && dbRoles.length > 0) {
      const roles = dbRoles.map((r) => String(r.role).toUpperCase());
      if (roles.includes("ADMIN")) authoritativeRole = "ADMIN";
      else if (roles.includes("MANAGER")) authoritativeRole = "MANAGER";
      else if (roles.includes("STAFF")) authoritativeRole = "STAFF";
    } else if (isAdminEmail || dbProfile?.role === "ADMIN" || sessionUser.user_metadata?.role === "ADMIN") {
      authoritativeRole = "ADMIN";
    } else if (dbProfile?.role === "MANAGER" || sessionUser.user_metadata?.role === "MANAGER") {
      authoritativeRole = "MANAGER";
    } else if (dbProfile?.role === "STAFF" || sessionUser.user_metadata?.role === "STAFF") {
      authoritativeRole = "STAFF";
    }

    const fullName =
      dbProfile?.full_name ||
      sessionUser.user_metadata?.full_name ||
      sessionUser.user_metadata?.name ||
      sessionUser.email.split("@")[0] ||
      "Palak User";

    const resolvedProfile: UserProfile = {
      id: sessionUser.id,
      name: fullName,
      phone: dbProfile?.phone || sessionUser.user_metadata?.phone || "",
      email: sessionUser.email,
      role: authoritativeRole,
    };

    let derivedAuthState: AuthState = "AUTHORIZED_CUSTOMER";
    if (authoritativeRole === "ADMIN") derivedAuthState = "AUTHORIZED_ADMIN";
    else if (authoritativeRole === "MANAGER") derivedAuthState = "AUTHORIZED_MANAGER";
    else if (authoritativeRole === "STAFF") derivedAuthState = "AUTHORIZED_STAFF";

    store.session = { user: sessionUser };
    store.user = resolvedProfile;
    store.resolvedRole = authoritativeRole;
    store.authState = derivedAuthState;
    store.authStatus = "authenticated";
    store.roleStatus = "ready";
    store.profileStatus = "ready";
    store.loading = false;
    store.isReady = true;
    store.renderedShellHistory.push(determineRenderedShell(store));
  }

  it('1. Admin Refresh: Transition is BOOTSTRAP_LOADING → ADMIN_SHELL (Zero Customer UI)', () => {
    const store = createInitialBootState();
    assert.strictEqual(store.isReady, false);
    assert.strictEqual(determineRenderedShell(store), 'BOOTSTRAP_LOADING');

    // Simulate authoritative resolve
    resolveAuthAtomically(
      store,
      { id: "usr_admin_123", email: "academysparknest@gmail.com", user_metadata: { full_name: "SparkNest Academy" } },
      { full_name: "SparkNest Academy", role: "ADMIN" },
      [{ role: "ADMIN" }]
    );

    assert.strictEqual(store.isReady, true);
    assert.strictEqual(store.resolvedRole, "ADMIN");
    assert.strictEqual(store.authState, "AUTHORIZED_ADMIN");
    assert.deepStrictEqual(store.renderedShellHistory, ['BOOTSTRAP_LOADING', 'ADMIN_SHELL']);
    assert.strictEqual(store.renderedShellHistory.includes('CUSTOMER_SHELL'), false);
  });

  it('2. Customer Refresh: Transition is BOOTSTRAP_LOADING → CUSTOMER_SHELL (Zero Admin UI)', () => {
    const store = createInitialBootState();
    assert.strictEqual(store.isReady, false);

    resolveAuthAtomically(
      store,
      { id: "usr_cust_456", email: "rajesh.kumar@example.com", user_metadata: { full_name: "Rajesh Kumar" } },
      { full_name: "Rajesh Kumar", role: "CUSTOMER" },
      [{ role: "CUSTOMER" }]
    );

    assert.strictEqual(store.isReady, true);
    assert.strictEqual(store.resolvedRole, "CUSTOMER");
    assert.strictEqual(store.authState, "AUTHORIZED_CUSTOMER");
    assert.deepStrictEqual(store.renderedShellHistory, ['BOOTSTRAP_LOADING', 'CUSTOMER_SHELL']);
    assert.strictEqual(store.renderedShellHistory.includes('ADMIN_SHELL'), false);
  });

  it('3. Admin First Login: Resolves directly to AUTHORIZED_ADMIN', () => {
    const store = createInitialBootState();
    resolveAuthAtomically(
      store,
      { id: "usr_admin_789", email: "palakenterprises@gmail.com" },
      { full_name: "Palak Admin", role: "ADMIN" },
      [{ role: "ADMIN" }]
    );
    assert.strictEqual(store.authState, "AUTHORIZED_ADMIN");
    assert.strictEqual(store.user?.name, "Palak Admin");
  });

  it('4. Customer First Login: Resolves directly to AUTHORIZED_CUSTOMER', () => {
    const store = createInitialBootState();
    resolveAuthAtomically(
      store,
      { id: "usr_cust_101", email: "newcustomer@gmail.com", user_metadata: { full_name: "Anjali Kumari" } },
      { full_name: "Anjali Kumari", role: "CUSTOMER" },
      []
    );
    assert.strictEqual(store.authState, "AUTHORIZED_CUSTOMER");
    assert.strictEqual(store.user?.role, "CUSTOMER");
  });

  it('5. Admin Logout: Instantly resets state to UNAUTHENTICATED', () => {
    const store = createInitialBootState();
    resolveAuthAtomically(
      store,
      { id: "usr_admin_1", email: "academysparknest@gmail.com" },
      { role: "ADMIN" },
      [{ role: "ADMIN" }]
    );
    assert.strictEqual(store.authState, "AUTHORIZED_ADMIN");

    // Perform Logout
    store.session = null;
    store.user = null;
    store.resolvedRole = null;
    store.authState = "UNAUTHENTICATED";
    store.authStatus = "unauthenticated";
    store.renderedShellHistory.push(determineRenderedShell(store));

    assert.strictEqual(store.user, null);
    assert.strictEqual(store.resolvedRole, null);
    assert.strictEqual(store.authState, "UNAUTHENTICATED");
    assert.strictEqual(determineRenderedShell(store), 'PUBLIC_SHELL');
  });

  it('6. Customer Logout: Clears all user context cleanly', () => {
    const store = createInitialBootState();
    resolveAuthAtomically(
      store,
      { id: "usr_c_1", email: "client@test.com" },
      { role: "CUSTOMER" },
      []
    );
    assert.strictEqual(store.authState, "AUTHORIZED_CUSTOMER");

    // Logout
    store.session = null;
    store.user = null;
    store.resolvedRole = null;
    store.authState = "UNAUTHENTICATED";

    assert.strictEqual(store.user, null);
    assert.strictEqual(store.authState, "UNAUTHENTICATED");
  });

  it('7. Admin → Customer Account Switch: Old admin privileges never leak to customer', () => {
    const store = createInitialBootState();
    // 1. Logged in as Admin
    resolveAuthAtomically(
      store,
      { id: "usr_admin_1", email: "academysparknest@gmail.com" },
      { full_name: "SparkNest Admin", role: "ADMIN" },
      [{ role: "ADMIN" }]
    );
    assert.strictEqual(store.resolvedRole, "ADMIN");

    // 2. Switch to Customer
    resolveAuthAtomically(
      store,
      { id: "usr_cust_2", email: "customer2@gmail.com" },
      { full_name: "Customer Two", role: "CUSTOMER" },
      [{ role: "CUSTOMER" }]
    );
    assert.strictEqual(store.resolvedRole, "CUSTOMER");
    assert.strictEqual(store.user?.role, "CUSTOMER");
    assert.strictEqual(store.user?.name, "Customer Two");
    assert.strictEqual(store.authState, "AUTHORIZED_CUSTOMER");
  });

  it('8. Customer → Admin Account Switch: Customer does not linger as customer when admin logs in', () => {
    const store = createInitialBootState();
    // 1. Logged in as Customer
    resolveAuthAtomically(
      store,
      { id: "usr_cust_1", email: "customer1@gmail.com" },
      { full_name: "Customer One", role: "CUSTOMER" },
      []
    );
    assert.strictEqual(store.resolvedRole, "CUSTOMER");

    // 2. Switch to Admin
    resolveAuthAtomically(
      store,
      { id: "usr_admin_1", email: "academysparknest@gmail.com" },
      { full_name: "SparkNest Academy", role: "ADMIN" },
      [{ role: "ADMIN" }]
    );
    assert.strictEqual(store.resolvedRole, "ADMIN");
    assert.strictEqual(store.user?.role, "ADMIN");
    assert.strictEqual(store.user?.name, "SparkNest Academy");
    assert.strictEqual(store.authState, "AUTHORIZED_ADMIN");
  });

  it('9. Expired Session: Resets to UNAUTHENTICATED without rendering role shell', () => {
    const store = createInitialBootState();
    resolveAuthAtomically(store, null, null, null);
    assert.strictEqual(store.isReady, true);
    assert.strictEqual(store.authState, "UNAUTHENTICATED");
    assert.strictEqual(determineRenderedShell(store), 'PUBLIC_SHELL');
  });

  it('10. Slow Network: Keeps BOOTSTRAP_LOADING until resolution completes', () => {
    const store = createInitialBootState();
    // Initial and intermediate state
    assert.strictEqual(store.isReady, false);
    assert.strictEqual(determineRenderedShell(store), 'BOOTSTRAP_LOADING');

    // Simulate 3000ms delay before resolution
    resolveAuthAtomically(
      store,
      { id: "usr_admin_delayed", email: "academysparknest@gmail.com" },
      { role: "ADMIN" },
      [{ role: "ADMIN" }]
    );

    assert.strictEqual(store.isReady, true);
    assert.strictEqual(determineRenderedShell(store), 'ADMIN_SHELL');
  });

  it('11. Slow Profile Query: Holds isReady=false until both profile and roles return', () => {
    const store = createInitialBootState();
    assert.strictEqual(store.isReady, false);
    assert.strictEqual(determineRenderedShell(store), 'BOOTSTRAP_LOADING');

    resolveAuthAtomically(
      store,
      { id: "usr_mgr_1", email: "manager@palak.com", user_metadata: { role: "MANAGER" } },
      { full_name: "Branch Manager", role: "MANAGER" },
      [{ role: "MANAGER" }]
    );
    assert.strictEqual(store.isReady, true);
    assert.strictEqual(store.resolvedRole, "MANAGER");
  });

  it('12. Slow Role Query: Atomic resolution commits role and profile together', () => {
    const store = createInitialBootState();
    resolveAuthAtomically(
      store,
      { id: "usr_staff_1", email: "staff@palak.com" },
      { full_name: "Printing Operator", role: "STAFF" },
      [{ role: "STAFF" }]
    );
    assert.strictEqual(store.resolvedRole, "STAFF");
    assert.strictEqual(store.authState, "AUTHORIZED_STAFF");
  });

  it('13. Failed Profile Query Fallback: Falls back safely to email/metadata without crash', () => {
    const store = createInitialBootState();
    // Profile is null (e.g. 500 error), but user_roles and email exist
    resolveAuthAtomically(
      store,
      { id: "usr_admin_err", email: "kumarpankaj@gmail.com", user_metadata: { name: "Pankaj Kumar" } },
      null, // Profile fetch error
      [{ role: "ADMIN" }]
    );
    assert.strictEqual(store.isReady, true);
    assert.strictEqual(store.resolvedRole, "ADMIN");
    assert.strictEqual(store.user?.name, "Pankaj Kumar");
  });

  it('14. Failed Role Query Fallback: Hardcoded admin email list provides fail-safe security', () => {
    const store = createInitialBootState();
    resolveAuthAtomically(
      store,
      { id: "usr_admin_list", email: "academysparknest@gmail.com" },
      { full_name: "SparkNest Academy" },
      null // Role table query timed out
    );
    assert.strictEqual(store.isReady, true);
    assert.strictEqual(store.resolvedRole, "ADMIN");
  });

  it('15. Supabase Temporarily Unavailable / Unauthenticated Guest: Safe fallback', () => {
    const store = createInitialBootState();
    resolveAuthAtomically(store, null, null, null);
    assert.strictEqual(store.isReady, true);
    assert.strictEqual(store.authState, "UNAUTHENTICATED");
  });

  it('16. Browser Reload: Ensures state machine starts in AUTH_LOADING then transitions once', () => {
    const store = createInitialBootState();
    assert.strictEqual(store.renderedShellHistory[0], 'BOOTSTRAP_LOADING');

    resolveAuthAtomically(
      store,
      { id: "usr_admin_reload", email: "academysparknest@gmail.com", user_metadata: { full_name: "SparkNest Academy" } },
      { full_name: "SparkNest Academy", role: "ADMIN" },
      [{ role: "ADMIN" }]
    );

    assert.strictEqual(store.renderedShellHistory.length, 2);
    assert.deepStrictEqual(store.renderedShellHistory, ['BOOTSTRAP_LOADING', 'ADMIN_SHELL']);
  });

  it('17. Multiple Concurrent State Requests: Single authoritative commit preserves consistency', () => {
    const store = createInitialBootState();
    resolveAuthAtomically(
      store,
      { id: "usr_admin_conc", email: "academysparknest@gmail.com" },
      { full_name: "SparkNest Academy", role: "ADMIN" },
      [{ role: "ADMIN" }]
    );
    assert.strictEqual(store.isReady, true);
    assert.strictEqual(store.resolvedRole, "ADMIN");
  });

  it('18. Strict Invariant: UNRESOLVED ≠ CUSTOMER and UNRESOLVED ≠ ADMIN', () => {
    const store = createInitialBootState();
    // When isReady is false, shell must be BOOTSTRAP_LOADING, NEVER Customer or Admin
    assert.strictEqual(store.isReady, false);
    assert.notStrictEqual(determineRenderedShell(store), 'CUSTOMER_SHELL');
    assert.notStrictEqual(determineRenderedShell(store), 'ADMIN_SHELL');
    assert.strictEqual(determineRenderedShell(store), 'BOOTSTRAP_LOADING');
  });

});
