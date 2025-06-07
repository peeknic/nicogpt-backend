export default (req, res) => {
  res.status(200).json({ status: "ok", message: "NicoGPT backend is alive and kicking ass." });
};
