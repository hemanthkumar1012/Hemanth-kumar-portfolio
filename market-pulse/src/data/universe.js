// Sectors and constituents for the simulated NIFTY 500 slice.
// Sector colours are greys on purpose: hue is reserved for gain/loss.
export const SECTORS = [
  ["IT", "#f5f5f5"],
  ["Banks", "#d4d4d4"],
  ["Pharma", "#b5b5b5"],
  ["Auto", "#9a9a9a"],
  ["FMCG", "#ededed"],
  ["Metals", "#7f7f7f"],
  ["Energy", "#c4c4c4"],
  ["Realty", "#a8a8a8"],
  ["Capital Goods", "#e0e0e0"],
  ["Financial Svcs", "#8f8f8f"],
  ["Consumer Durables", "#bdbdbd"],
  ["Telecom", "#6f6f6f"],
];

// Daily drift per sector. Tuned so the window shows real rotation:
// Realty and Capital Goods lead, FMCG and IT lag.
export const SECTOR_DRIFT = {
  IT: 0.0002,
  Banks: 0.0006,
  Pharma: 0.0009,
  Auto: 0.0007,
  FMCG: -0.0001,
  Metals: 0.0003,
  Energy: 0.0004,
  Realty: 0.0012,
  "Capital Goods": 0.001,
  "Financial Svcs": 0.0005,
  "Consumer Durables": 0.0003,
  Telecom: 0.0008,
};

export const CONSTITUENTS = {
  IT: [["INFY", "Infosys"], ["TCS", "Tata Consultancy"], ["HCLTECH", "HCL Tech"], ["WIPRO", "Wipro"], ["TECHM", "Tech Mahindra"], ["LTIM", "LTIMindtree"], ["PERSISTENT", "Persistent Sys"], ["COFORGE", "Coforge"]],
  Banks: [["HDFCBANK", "HDFC Bank"], ["ICICIBANK", "ICICI Bank"], ["SBIN", "State Bank"], ["KOTAKBANK", "Kotak Bank"], ["AXISBANK", "Axis Bank"], ["INDUSINDBK", "IndusInd"], ["BANKBARODA", "Bank of Baroda"], ["PNB", "Punjab Natl Bank"]],
  Pharma: [["SUNPHARMA", "Sun Pharma"], ["DRREDDY", "Dr Reddy's"], ["CIPLA", "Cipla"], ["DIVISLAB", "Divi's Labs"], ["LUPIN", "Lupin"], ["AUROPHARMA", "Aurobindo"], ["ZYDUSLIFE", "Zydus"], ["TORNTPHARM", "Torrent"]],
  Auto: [["MARUTI", "Maruti Suzuki"], ["M&M", "Mahindra"], ["TATAMOTORS", "Tata Motors"], ["BAJAJ-AUTO", "Bajaj Auto"], ["EICHERMOT", "Eicher"], ["HEROMOTOCO", "Hero Moto"], ["TVSMOTOR", "TVS Motor"], ["ASHOKLEY", "Ashok Leyland"]],
  FMCG: [["HINDUNILVR", "HUL"], ["ITC", "ITC"], ["NESTLEIND", "Nestle"], ["BRITANNIA", "Britannia"], ["DABUR", "Dabur"], ["MARICO", "Marico"], ["GODREJCP", "Godrej Consumer"], ["TATACONSUM", "Tata Consumer"]],
  Metals: [["TATASTEEL", "Tata Steel"], ["JSWSTEEL", "JSW Steel"], ["HINDALCO", "Hindalco"], ["VEDL", "Vedanta"], ["SAIL", "SAIL"], ["NMDC", "NMDC"], ["JINDALSTEL", "Jindal Steel"]],
  Energy: [["RELIANCE", "Reliance"], ["ONGC", "ONGC"], ["NTPC", "NTPC"], ["POWERGRID", "Power Grid"], ["BPCL", "BPCL"], ["IOC", "Indian Oil"], ["COALINDIA", "Coal India"], ["TATAPOWER", "Tata Power"]],
  Realty: [["DLF", "DLF"], ["GODREJPROP", "Godrej Prop"], ["OBEROIRLTY", "Oberoi Realty"], ["PRESTIGE", "Prestige"], ["LODHA", "Macrotech"], ["PHOENIXLTD", "Phoenix Mills"]],
  "Capital Goods": [["LT", "Larsen & Toubro"], ["SIEMENS", "Siemens"], ["ABB", "ABB India"], ["BEL", "Bharat Electronics"], ["HAL", "Hindustan Aero"], ["BHEL", "BHEL"], ["CUMMINSIND", "Cummins"]],
  "Financial Svcs": [["BAJFINANCE", "Bajaj Finance"], ["BAJAJFINSV", "Bajaj Finserv"], ["HDFCLIFE", "HDFC Life"], ["SBILIFE", "SBI Life"], ["CHOLAFIN", "Chola Finance"], ["SHRIRAMFIN", "Shriram Fin"], ["MUTHOOTFIN", "Muthoot"]],
  "Consumer Durables": [["TITAN", "Titan"], ["HAVELLS", "Havells"], ["VOLTAS", "Voltas"], ["DIXON", "Dixon Tech"], ["CROMPTON", "Crompton"], ["BLUESTARCO", "Blue Star"]],
  Telecom: [["BHARTIARTL", "Bharti Airtel"], ["INDUSTOWER", "Indus Towers"], ["IDEA", "Vodafone Idea"], ["TATACOMM", "Tata Comm"]],
};
