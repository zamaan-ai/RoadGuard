import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { api } from '../api/client';
import { socket } from '../api/socket';

const StoreContext = createContext(null);

function initialState() {
  return {
    reports: [],
    activity: [],
    notifications: [],
    fleet: [],
    workflow: [],
    settings: { refresh: 'Real-time', mapLayer: 'Road Intelligence', criticalAlerts: true },

    loading: true,
    loadError: null,
    connected: false,

    toast: null,
    modalOpen: false,
    activePage: 'dashboard',
    mapPopover: null,
    reportSearchTerm: '',
    reportSeverityFilter: 'all',
  };
}

function upsertById(list, item) {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx === -1) return [item, ...list];
  const copy = [...list];
  copy[idx] = item;
  return copy;
}

function insertIfMissing(list, item) {
  if (list.some((x) => x.id === item.id)) return list;
  return [item, ...list];
}

function reducer(state, action) {
  switch (action.type) {
    // ---- initial + live data sync from the backend ----
    case 'HYDRATE':
      return { ...state, ...action.payload, loading: false, loadError: null };

    case 'SET_LOADING':
      return { ...state, loading: action.value };

    case 'SET_LOAD_ERROR':
      return { ...state, loading: false, loadError: action.message };

    case 'SET_CONNECTED':
      return { ...state, connected: action.value };

    case 'REPORT_CREATED':
      return { ...state, reports: insertIfMissing(state.reports, action.report) };

    case 'REPORT_UPDATED':
      return { ...state, reports: upsertById(state.reports, action.report) };

    case 'REPORT_DELETED':
      return { ...state, reports: state.reports.filter((r) => r.id !== action.id) };

    case 'ACTIVITY_CREATED':
      return { ...state, activity: insertIfMissing(state.activity, action.entry) };

    case 'NOTIFICATION_CREATED':
      return { ...state, notifications: insertIfMissing(state.notifications, action.notification) };

    case 'NOTIFICATIONS_REPLACED':
      return { ...state, notifications: action.notifications };

    case 'FLEET_UPDATED':
      return { ...state, fleet: upsertById(state.fleet, action.vehicle) };

    case 'WORKFLOW_REPLACED':
      return { ...state, workflow: action.workflow };

    case 'SETTINGS_REPLACED':
      return { ...state, settings: action.settings };

    // ---- local-only UI state (no backend concept) ----
    case 'NAVIGATE':
      return { ...state, activePage: action.page, mapPopover: null };
    case 'OPEN_MODAL':
      return { ...state, modalOpen: true };
    case 'CLOSE_MODAL':
      return { ...state, modalOpen: false };
    case 'SHOW_TOAST':
      return { ...state, toast: action.message };
    case 'CLEAR_TOAST':
      return { ...state, toast: null };
    case 'SET_MAP_POPOVER':
      return { ...state, mapPopover: action.payload };
    case 'SET_REPORT_SEARCH':
      return { ...state, reportSearchTerm: action.term };
    case 'SET_REPORT_FILTER':
      return { ...state, reportSeverityFilter: action.filter };
    case 'GLOBAL_SEARCH_SUBMIT':
      return { ...state, activePage: 'reports', reportSearchTerm: action.term };

    // Optimistic, unsaved settings edits (before "Save Settings" persists them)
    case 'SETTINGS_DRAFT_UPDATE':
      return { ...state, settings: { ...state.settings, ...action.payload } };

    default:
      return state;
  }
}

export function statusLabel(status) {
  return { open: 'Open', assigned: 'Assigned', repair: 'In Repair', resolved: 'Resolved' }[status] || status;
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  // ---- initial hydration from the backend ----
  useEffect(() => {
    let cancelled = false;

    async function load() {
      dispatch({ type: 'SET_LOADING', value: true });
      try {
        const [reportsRes, fleetRes, workflowRes, notificationsRes, activityRes, settingsRes] = await Promise.all([
          api.getReports(),
          api.getFleet(),
          api.getWorkflow(),
          api.getNotifications(),
          api.getActivity(),
          api.getSettings(),
        ]);
        if (cancelled) return;
        dispatch({
          type: 'HYDRATE',
          payload: {
            reports: reportsRes.reports,
            fleet: fleetRes.fleet,
            workflow: workflowRes.workflow,
            notifications: notificationsRes.notifications,
            activity: activityRes.activity,
            settings: settingsRes.settings,
          },
        });
      } catch (err) {
        if (!cancelled) {
          dispatch({
            type: 'SET_LOAD_ERROR',
            message: `Couldn't reach the RoadGuard API. Is the backend running? (${err.message})`,
          });
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // ---- real-time updates pushed from the backend over Socket.IO ----
  useEffect(() => {
    function onConnect() { dispatch({ type: 'SET_CONNECTED', value: true }); }
    function onDisconnect() { dispatch({ type: 'SET_CONNECTED', value: false }); }
    function onReportCreated(report) { dispatch({ type: 'REPORT_CREATED', report }); }
    function onReportUpdated(report) { dispatch({ type: 'REPORT_UPDATED', report }); }
    function onReportDeleted({ id }) { dispatch({ type: 'REPORT_DELETED', id }); }
    function onActivityCreated(entry) { dispatch({ type: 'ACTIVITY_CREATED', entry }); }
    function onNotificationCreated(notification) { dispatch({ type: 'NOTIFICATION_CREATED', notification }); }
    function onNotificationsMarkedAllRead(notifications) { dispatch({ type: 'NOTIFICATIONS_REPLACED', notifications }); }
    function onFleetUpdated(vehicle) { dispatch({ type: 'FLEET_UPDATED', vehicle }); }
    function onWorkflowUpdated(workflow) { dispatch({ type: 'WORKFLOW_REPLACED', workflow }); }
    function onSettingsUpdated(settings) { dispatch({ type: 'SETTINGS_REPLACED', settings }); }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('report:created', onReportCreated);
    socket.on('report:updated', onReportUpdated);
    socket.on('report:deleted', onReportDeleted);
    socket.on('activity:created', onActivityCreated);
    socket.on('notification:created', onNotificationCreated);
    socket.on('notifications:markedAllRead', onNotificationsMarkedAllRead);
    socket.on('fleet:updated', onFleetUpdated);
    socket.on('workflow:updated', onWorkflowUpdated);
    socket.on('settings:updated', onSettingsUpdated);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('report:created', onReportCreated);
      socket.off('report:updated', onReportUpdated);
      socket.off('report:deleted', onReportDeleted);
      socket.off('activity:created', onActivityCreated);
      socket.off('notification:created', onNotificationCreated);
      socket.off('notifications:markedAllRead', onNotificationsMarkedAllRead);
      socket.off('fleet:updated', onFleetUpdated);
      socket.off('workflow:updated', onWorkflowUpdated);
      socket.off('settings:updated', onSettingsUpdated);
    };
  }, []);

  const stats = useMemo(() => {
    const critical = state.reports.filter((r) => r.severity === 'critical' && r.status !== 'resolved').length;
    const moderate = state.reports.filter((r) => r.severity === 'moderate' && r.status !== 'resolved').length;
    const total = state.reports.length;
    const resolved = state.reports.filter((r) => r.status === 'resolved').length;
    const openWorkOrders = state.reports.filter((r) => r.status !== 'resolved').length;
    return { critical, moderate, total, resolved, openWorkOrders };
  }, [state.reports]);

  const unreadCount = useMemo(
    () => state.notifications.filter((n) => !n.read).length,
    [state.notifications]
  );

  // ---- actions: local UI state ----
  const navigate = useCallback((page) => dispatch({ type: 'NAVIGATE', page }), []);
  const openModal = useCallback(() => dispatch({ type: 'OPEN_MODAL' }), []);
  const closeModal = useCallback(() => dispatch({ type: 'CLOSE_MODAL' }), []);
  const showToast = useCallback((message) => dispatch({ type: 'SHOW_TOAST', message }), []);
  const clearToast = useCallback(() => dispatch({ type: 'CLEAR_TOAST' }), []);
  const setMapPopover = useCallback((payload) => dispatch({ type: 'SET_MAP_POPOVER', payload }), []);
  const setReportSearch = useCallback((term) => dispatch({ type: 'SET_REPORT_SEARCH', term }), []);
  const setReportFilter = useCallback((filter) => dispatch({ type: 'SET_REPORT_FILTER', filter }), []);
  const globalSearchSubmit = useCallback((term) => dispatch({ type: 'GLOBAL_SEARCH_SUBMIT', term }), []);

  // ---- actions: real backend calls ----
  const submitReport = useCallback(async (payload) => {
    const { report, activityEntry, notification } = await api.submitReport(payload);
    dispatch({ type: 'REPORT_CREATED', report });
    dispatch({ type: 'ACTIVITY_CREATED', entry: activityEntry });
    if (notification) dispatch({ type: 'NOTIFICATION_CREATED', notification });
    dispatch({ type: 'CLOSE_MODAL' });
    dispatch({ type: 'SHOW_TOAST', message: '✓ Road damage report submitted' });
    return report;
  }, []);

  const advanceReportStatus = useCallback(async (id) => {
    try {
      const { report } = await api.advanceReport(id);
      dispatch({ type: 'REPORT_UPDATED', report });
      dispatch({
        type: 'SHOW_TOAST',
        message: report.status === 'resolved' ? `✓ ${report.id} marked resolved` : `Moved ${report.id} to ${statusLabel(report.status)}`,
      });
    } catch (err) {
      dispatch({ type: 'SHOW_TOAST', message: `⚠ ${err.message}` });
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      const { notifications } = await api.markAllRead();
      dispatch({ type: 'NOTIFICATIONS_REPLACED', notifications });
    } catch (err) {
      dispatch({ type: 'SHOW_TOAST', message: `⚠ ${err.message}` });
    }
  }, []);

  const advanceWorkflow = useCallback(async () => {
    try {
      const { workflow, changed, completedTitle } = await api.advanceWorkflow();
      dispatch({ type: 'WORKFLOW_REPLACED', workflow });
      if (changed) dispatch({ type: 'SHOW_TOAST', message: `✓ ${completedTitle} complete` });
    } catch (err) {
      dispatch({ type: 'SHOW_TOAST', message: `⚠ ${err.message}` });
    }
  }, []);

  const cycleFleetStatus = useCallback(async (id) => {
    try {
      const { vehicle } = await api.cycleFleetStatus(id);
      dispatch({ type: 'FLEET_UPDATED', vehicle });
    } catch (err) {
      dispatch({ type: 'SHOW_TOAST', message: `⚠ ${err.message}` });
    }
  }, []);

  // Local, optimistic draft edits while the user is fiddling with the Settings form
  const updateSettings = useCallback((payload) => dispatch({ type: 'SETTINGS_DRAFT_UPDATE', payload }), []);

  // Persists the current settings draft to the backend
  const saveSettings = useCallback(async () => {
    try {
      const { settings } = await api.updateSettings(state.settings);
      dispatch({ type: 'SETTINGS_REPLACED', settings });
      dispatch({ type: 'SHOW_TOAST', message: '✓ Settings saved' });
    } catch (err) {
      dispatch({ type: 'SHOW_TOAST', message: `⚠ ${err.message}` });
    }
  }, [state.settings]);

  const actions = useMemo(() => ({
    navigate,
    openModal,
    closeModal,
    showToast,
    clearToast,
    setMapPopover,
    submitReport,
    advanceReportStatus,
    markAllRead,
    advanceWorkflow,
    cycleFleetStatus,
    updateSettings,
    saveSettings,
    setReportSearch,
    setReportFilter,
    globalSearchSubmit,
  }), [
    navigate, openModal, closeModal, showToast, clearToast, setMapPopover,
    submitReport, advanceReportStatus, markAllRead, advanceWorkflow,
    cycleFleetStatus, updateSettings, saveSettings, setReportSearch,
    setReportFilter, globalSearchSubmit,
  ]);

  const value = useMemo(() => ({ state, stats, unreadCount, ...actions }), [state, stats, unreadCount, actions]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
