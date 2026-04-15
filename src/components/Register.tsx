"use client";
import { useState } from "react";
import Redis from "ioredis";
import { emit } from "node:process";

export default function Register() {
  const [user_id, setUserId] = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [reason, setReason] = useState<string>("");

  const normalizeUser = (value: string) => value.trim();

  const checkUserId = async (value: string) => {
    const normalized = normalizeUser(value);
    setUserId(normalized);

    if (!normalized) {
      setAvailable(null);
      setReason("");
      return;
    }

    if(normalized.length < 6){
      setAvailable(false);
      setReason("아이디는 6자 이상이여야 합니다.");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(user_id)) {
      setAvailable(false);
      setReason("아이디는 영문/숫자/언더스코어만 가능합니다.");
      return;
    }

    

    const res = await fetch(
      `/api/user/register/checkUserId/${encodeURIComponent(normalized)}`
    );

    if (!res.ok) {
      const text = await res.text();
      setAvailable(false);
      setReason("서버 오류가 발생했습니다.");
      return;
    }




    const data = await res.json();
    setAvailable(data.available);
    setReason(data.reason ?? "");
    
  };

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const resultEmail = (email: String) => email.trim();

  const checkUserEmail = async() =>{
    try{

      const email_result_request = await fetch(`/api/user/register/checkUserEmail/`,{
        method: "POST",
        headers:{
          "Content-Type":"application/json"
        },
        body: JSON.stringify({
          email: resultEmail(email),
          
        }),

      });

    }catch(error){

    }
  }

  return (
    <div className="w-full h-full">
      <div className="w-full h-full">
        <div className="border border-solid rounded-xl p-20 mx-auto w-1/2 placeholder:text-center border-white pt30">
          <div className="w-80 mx-auto">
            <input
              type="text"
              id="user_id"
              className="bg-white rounded-lg placeholder:text-center mx-auto mb-4 mr-1 w-full px-3 py-2 text-center"
              placeholder="아이디"
              value={user_id}
              onChange={(e) => {
                setUserId(e.target.value);
              }}
              onBlur={(e) => {
                void checkUserId(e.target.value);
              }}
            />
            {available === null ? null : available ? (
              <p className="text-white">사용 가능한 아이디입니다.</p>
            ) : (
              <p className="text-white">
                사용 불가: {reason || "이미 사용 중입니다."}
              </p>
            )}
          </div>
          <input
            type="password"
            id="user_password"
            className="bg-white rounded-lg block text-center mx-auto mb-4 w-80 px-3 py-2"
            placeholder="비밀번호"
          />
          <div className="w-80 mx-auto flex items-center gap-2">
            <input
              type="email"
              id="user_email"
              className="bg-white rounded-lg placeholder:text-center mx-auto mb-4 mr-1 w-full px-3 py-2 text-center"
              placeholder="이메일"
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="text-black rounded-xl bg-white w-20 h-10" onClick={(e) => {
              void checkUserEmail();
            }}>
              인증하기
            </button>
          </div>
          <button className="text-black rounded-xl bg-white w-20 mx-auto block">
            회원가입
          </button>
        </div>
      </div>
    </div>
  );
}
