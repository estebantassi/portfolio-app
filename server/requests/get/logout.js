const Logout = async (req, res) => {

    if (!req.cookies || !req.cookies.refreshtoken) return res.status(400).json("Already logged out")

    res.clearCookie("refreshtoken", { path: "/refreshtoken" })
    res.clearCookie("accesstoken", { path: "/" })
    return res.status(200).json("Successfully logged out")
}

module.exports = { Logout }