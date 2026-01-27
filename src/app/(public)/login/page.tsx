
export default function page(){
    return(
        <div className="w-screen">

            <div className="w-4/10 h-7/10 mx-auto">

                <div className="mt-30">

                    <p className="text-center mb-5">로그인</p>

                    <input type="text" placeholder="아이디" id="user_id" className="block mx-auto focus:outline-sky-500"/>

                    <input type="password" placeholder="비밀번호" id="user_password" className="block mx-auto focus:outline-sky-500 mt-5"/>

                    <button className="hover:not-focus:bg-indigo-700 bg-indigo-600 b-xl">
                        로그인
                    </button>
            
                </div>
            </div>
            
        </div>
    );
}