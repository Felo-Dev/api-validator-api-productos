import jwt from "jsonwebtoken";
import config from "../config.js";
import * as usersRepo from "../repositories/users.repository.js";

export const verifyToken = async (req, res, next) => {
   try {
      let token = null;
      if (req.headers.authorization) {
         const parts = req.headers.authorization.split(' ');
         if (parts.length === 2 && parts[0] === 'Bearer') {
            token = parts[1];
         }
      }

      if (!token) {
         console.error("No token provided");
         return res.status(403).json({ message: "No token provided" });
      }

      const decoded = jwt.verify(token, config.SECRET);
      req.userId = decoded.id;

      const user = await usersRepo.findUserById(req.userId);

      if (!user) {
         console.error("No user found for token");
         return res.status(404).json({ message: "No user found" });
      }

      next();
   } catch (error) {
      console.error("No autorizado:", error.message);
      res.status(401).json({ message: "No autorizado" });
   }
};

export const isModerator = async (req, res, next) => {
   const roles = await usersRepo.getUserRoles(req.userId);
   if (roles.includes("moderator")) return next();

   return res.status(403).json({ message: "require moderator rol" });
};

export const isAdmin = async (req, res, next) => {
   const roles = await usersRepo.getUserRoles(req.userId);
   if (roles.includes("admin")) return next();

   return res.status(403).json({ message: "require admin rol" });
};