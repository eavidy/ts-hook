import "./exports/mod_ts";
console.log(exports as any);

process.send?.("entry");
