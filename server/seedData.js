import bcrypt from 'bcryptjs';

const HOUR = 3600e3;

export function buildSeed({ adminUsername, adminPassword }) {
  const now = Date.now();

  return {
    users: [
      {
        id: 'U-1',
        username: adminUsername,
        passwordHash: bcrypt.hashSync(adminPassword, 10),
        name: 'John Doe',
        role: 'Municipal Admin',
      },
    ],

    reports: [
      { id: 'RG-1028', location: 'Main St & 5th Ave', damage: 'Deep Pothole', severity: 'critical', score: 96, status: 'open', x: 42, y: 25, created: now - 2 * HOUR, description: '', photoUrl: null },
      { id: 'RG-1027', location: 'Riverside Ave', damage: 'Surface Collapse', severity: 'critical', score: 93, status: 'assigned', x: 61, y: 53, created: now - 3 * HOUR, description: '', photoUrl: null },
      { id: 'RG-1026', location: 'Oak Street', damage: 'Large Crack', severity: 'moderate', score: 87, status: 'repair', x: 30, y: 64, created: now - 25 * HOUR, description: '', photoUrl: null },
      { id: 'RG-1025', location: 'Pine Road', damage: 'Patch Needed', severity: 'moderate', score: 82, status: 'open', x: 80, y: 67, created: now - 30 * HOUR, description: '', photoUrl: null },
      { id: 'RG-1024', location: 'Maple Ave', damage: 'Minor Crack', severity: 'minor', score: 76, status: 'resolved', x: 76, y: 25, created: now - 34 * HOUR, description: '', photoUrl: null },
    ],

    activity: [
      { id: 1, tone: 'red', icon: '!', text: 'New critical issue detected at **Main St & 5th Ave**', time: now - 2 * HOUR },
      { id: 2, tone: 'blue', icon: '⌁', text: 'Work order **#WO-4587** assigned to Maintenance Team', time: now - 3 * HOUR },
      { id: 3, tone: 'green', icon: '✓', text: 'Issue resolved at **Oak Street**', time: now - 6 * HOUR },
      { id: 4, tone: 'cyan', icon: '▰', text: 'Fleet vehicle **#F-12** completed 12 scans', time: now - 8 * HOUR },
    ],

    notifications: [
      { id: 1, tone: 'critical-alert', icon: '!', title: 'Critical pothole detected', body: 'Main St & 5th Ave · AI confidence 96%', time: now - 2 * HOUR, read: false },
      { id: 2, tone: '', icon: '⌁', title: 'Repair crew dispatched', body: 'Work order #WO-4587 assigned to Maintenance Team', time: now - 3 * HOUR, read: false },
      { id: 3, tone: '', icon: '✓', title: 'Road issue resolved', body: 'Post-repair scan completed at Oak Street', time: now - 6 * HOUR, read: false },
    ],

    fleet: [
      { id: 'F-01', name: 'Fleet Vehicle 01', route: 'Station → Market Route', status: 'Scanning', coverage: 88, icon: '🚛' },
      { id: 'PB-14', name: 'Public Bus 14', route: 'Railway → Hotgi Route', status: 'Moving', coverage: 76, icon: '🚌' },
      { id: 'IU-03', name: 'Inspection Unit 03', route: 'North Zone', status: 'Scanning', coverage: 94, icon: '🚚' },
    ],

    workflow: [
      { id: 1, title: 'AI Detection', desc: 'Camera + IMU sensor fusion identifies the road anomaly.', status: 'done' },
      { id: 2, title: 'Priority Assignment', desc: 'Severity score considers damage, location and vibration impact.', status: 'done' },
      { id: 3, title: 'Crew Dispatch', desc: 'Repair team receives location and work-order instructions.', status: 'active' },
      { id: 4, title: 'Post-Repair Scan', desc: 'Vehicle rescans the repaired segment to verify resolution.', status: 'pending' },
    ],

    settings: { refresh: 'Real-time', mapLayer: 'Road Intelligence', criticalAlerts: true },

    nextIdNum: 1029,
    nextActivityId: 5,
    nextNotificationId: 4,
  };
}

export const DAMAGE_SEVERITY_TABLE = {
  'Deep Pothole': 'critical',
  'Surface Collapse': 'critical',
  'Road Depression': 'moderate',
  'Large Crack': 'moderate',
};

export const DAMAGE_TYPES = ['Deep Pothole', 'Large Crack', 'Road Depression', 'Surface Collapse'];
