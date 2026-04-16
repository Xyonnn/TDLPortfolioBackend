import admin from "../firebase-admin.js";

export const verifyFirebaseToken = async (req, res, next) => {
    const header = req.headers.authorization;

    if(!header || !header.startsWith("Bearer ")){
        return res.status(401).send("Brak tokenu");
    }

    const token = header.split(' ')[1];

    try{
        const decoded = await admin.auth().verifyIdToken(token);
        req.user = decoded;
        next();
    }catch(err){
        res.status(401).send("Niewlasciwy token");
    }
}