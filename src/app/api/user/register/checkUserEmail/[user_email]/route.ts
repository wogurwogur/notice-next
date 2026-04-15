import {NextResponse} from "next/server";
import {redis} from "@/lib/redis"

// 코드 지속시간
const CODE_TTL_TIME = 60 * 5;

function makeCode(){
    return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(
    req: Request
){

    const {searchParams} = new URL(req.url);
    const email = searchParams.get("email");
    console.log(email);

    return NextResponse.json(
        {message : ""}
    );
}
     
