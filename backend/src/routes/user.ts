import { Hono } from "hono";
import { PrismaClient } from '@prisma/client/edge'
import { sign } from 'hono/jwt'
import { signInInput, signUpInput } from "@priyans34/medium-common";
import {
        setCookie,
} from 'hono/cookie'


export const userRouter = new Hono<{
        Bindings: {
                DATABASE_URL: string,
                JWT_SECRET: string,
                REFRESH_TOKEN_SECRET: string,
        }
}
>();



userRouter.post('signup', async (c) => {
        // @ts-ignore
        const prisma: PrismaClient = c.get('prisma');
        const body = await c.req.json();
        const { success } = signUpInput.safeParse(body);
        if (!success) { 
                c.status(400);
                return c.json({ message: 'Invalid request body' })
        }


        const user = await prisma.user.create({
                data: body
        })

        if (!user) {
                return c.json({ message: "Internal Server Error" });
        }


        const refreshPayload = {
                id: user.id,
                exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // Token expires in 7 days
        }
        const refreshsecret = c.env?.REFRESH_TOKEN_SECRET
        const refreshToken = await sign(refreshPayload, refreshsecret)

        //update the refresh token in the database
        await prisma.user.update({
                where: {
                        id: user.id
                },
                data: {
                        refreshToken
                }
        })

        //set the refresh token in the cookie
        setCookie(c, 'refresh_token', refreshToken, {
                path: '/',
                sameSite: 'Strict',
        });

        const payload = {
                id: user.id,
                exp: Math.floor(Date.now() / 1000) + 60 * 60, // Token expires in 5 minutes
        }
        const secret = c.env?.JWT_SECRET
        const token = await sign(payload, secret)
        return c.json({ jwt: token })
})

userRouter.post('signin', async (c) => {
        // @ts-ignore
        const prisma: PrismaClient = c.get('prisma');
        const body = await c.req.json();
        const { success } = signInInput.safeParse(body);
        if (!success) { 
                c.status(400);
                return c.json({ message: 'Invalid request body' })
        }
        const user = await prisma.user.findUnique({
                where: {
                        email: body.email,
                        password: body.password
                },
        })

        if (!user) {
                c.status(403);
                return c.json({ message: 'Invalid email or password' })
        }

        const refreshPayload = {
                id: user.id,
                exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // Token expires in 7 days
        }
        const refreshsecret = c.env?.REFRESH_TOKEN_SECRET
        const refreshToken = await sign(refreshPayload, refreshsecret)

        //update the refresh token in the database
        await prisma.user.update({
                where: {
                        id: user.id
                },
                data: {
                        refreshToken
                }
        })


        //set the refresh token in the cookie
        setCookie(c, 'refresh_token', refreshToken, {
                path: '/',
                sameSite: 'Strict',
        });


        const payload = {
                id: user.id,
                exp: Math.floor(Date.now() / 1000) + 60 * 60, // Token expires in 5 minutes
        }
        const secret = c.env?.JWT_SECRET
        const token = await sign(payload, secret)
        return c.json({ jwt: token })
})