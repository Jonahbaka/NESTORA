export const demoAccounts = [
  {
    key: "renter",
    name: "Adaeze Demo",
    email: "renter.qa@demo.nestora.local",
    role: "member",
    label: "Renter / buyer demo account",
  },
  {
    key: "agent",
    name: "Amina Demo",
    email: "agent.qa@demo.nestora.local",
    role: "agent",
    label: "Independent agent demo account",
  },
  {
    key: "developer",
    name: "Chinedu Demo",
    email: "developer.qa@demo.nestora.local",
    role: "developer",
    label: "Developer administrator demo account",
  },
  {
    key: "hotel",
    name: "Zainab Demo",
    email: "hotel.qa@demo.nestora.local",
    role: "host",
    label: "Hotel administrator demo account",
  },
  {
    key: "agency",
    name: "Kemi Demo",
    email: "agency.qa@demo.nestora.local",
    role: "agency_admin",
    label: "Agency administrator demo account",
  },
  {
    key: "admin",
    name: "Tunde Demo",
    email: "admin.qa@demo.nestora.local",
    role: "admin",
    label: "Platform administrator demo account",
  },
];

export const demoAccountByKey = Object.fromEntries(demoAccounts.map((account) => [account.key, account]));
