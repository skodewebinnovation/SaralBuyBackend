import express from "express"
import categoryRouter from "./category.route.js"
const router = express.Router();


router.get('/',(_,res)=>{
    res.send('#index.js working ')
})

const routes =[
    {path:"/category",router:categoryRouter}
]


routes.forEach((route)=>{
    router.use(route.path,route.router)
})

export default router

