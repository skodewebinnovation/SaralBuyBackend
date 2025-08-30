import express from "express"
import categoryRouter from "./category.route.js"
import productRouter from "./product.route.js"
import userRouter from "./user.route.js"
const router = express.Router();


router.get('/',(_,res)=>{
    res.send('#index.js working ')
})

const routes =[
    {path:"/category",router:categoryRouter},
    {path:"/product",router:productRouter},
    {path:'/user',router:userRouter}
]


routes.forEach((route)=>{
    router.use(route.path,route.router)
})

export default router

