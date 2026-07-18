// api/chapa-initiate.js

module.exports = async (req, res) => {
    // ከ POST ውጪ የሚመጡ ጥያቄዎችን ውድቅ ማድረግ
    if (req.method !== 'POST') {
        return res.status(405).json({ status: "failed", message: "Method not allowed. Use POST." });
    }

    // ከ Frontend የተላከውን መረጃ መቀበል
    const { amount, motorist_id, email, first_name, last_name } = req.body;

    // ወሳኝ መረጃዎች መኖራቸውን ማረጋገጥ
    if (!amount || !motorist_id) {
        return res.status(400).json({ status: "failed", message: "Amount and motorist_id are required!" });
    }

    // ለእያንዳንዱ ክፍያ ልዩ መለያ ቁጥር (tx_ref) ማመንጨት
    const tx_ref = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // የዌብሳይትህን ሊንክ (Localhost ይሁን Production) በራሱ እንዲያገኝ ማድረግ
    const host = req.headers.host;
    const protocol = host.includes('localhost') ? 'http' : 'https';
    
    // ክፍያው ሲያልቅ ቻፓ ሞተረኛውን የሚመልስበት ሊንክ (ቀድሞ የሰራነው የቬሪፊኬሽን API)
    const return_url = `${protocol}://${host}/api/chapa-verify?tx_ref=${tx_ref}`;

    try {
        // ወደ ቻፓ ሰርቨር መረጃውን መላክ (Initialize ማድረግ)
        const chapaResponse = await fetch('https://api.chapa.co/v1/transaction/initialize', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.CHAPA_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amount,
                currency: "ETB",
                email: email || "motorist@tirfe.com", // ከሌለ ዲፎልት መሙላት
                first_name: first_name || "Motorist",
                last_name: last_name || "User",
                tx_ref: tx_ref,
                return_url: return_url,
                meta: {
                    motorist_id: motorist_id // ይህ መረጃ ቬሪፊኬሽን ላይ የሰውን አካውንት ለመለየት ይጠቅማል
                }
            })
        });

        const chapaData = await chapaResponse.json();

        // ቻፓ ክፍያውን በተሳካ ሁኔታ ካስጀመረው
        if (chapaData.status === "success" && chapaData.data) {
            return res.status(200).json({
                status: "success",
                checkout_url: chapaData.data.checkout_url, // የቻፓ መክፈያ ገጽ ሊንክ
                tx_ref: tx_ref
            });
        } else {
            return res.status(400).json({
                status: "failed",
                message: chapaData.message || "Chapa initialization failed."
            });
        }

    } catch (error) {
        console.error("Chapa Init Error:", error);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
};

