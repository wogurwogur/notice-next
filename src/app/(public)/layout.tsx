import Header from "@/components/header"


export default function page({children}:{children: React.ReactNode}){
    return(
        <div>
            <Header></Header>

            <div>
                {children}
            </div>
            
        </div>
    );
}