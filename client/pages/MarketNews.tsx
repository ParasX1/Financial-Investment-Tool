import React from "react";
import Sidebar from "@/components/sidebar"; // Adjust the path to match where Sidebar is located in your project

import { Grid} from '@mui/material';


const MarketNews: React.FC = () => {
    

    return (
        <div>
            <div style={{ display: 'flex' }}>
                <Sidebar />
            

            
                    <div style={{ padding: '20px' }}>
                        <Grid container spacing={2}>
                            {/* Main Large Card */}
                            <Grid item xs={12} md={8}>
                                
                            </Grid>

                            {/* Vertical Stack of Cards */}
                            <Grid item xs={12} md={4}>
                                <Grid container direction="column" spacing={2}>
                                    {[1, 2].map((index) => (
                                        <Grid item key={index}>
                                            
                                        </Grid>
                                    ))}
                                </Grid>
                            </Grid>

                            {/* Bottom Row of Cards */}
                            <Grid item xs={12}>
                                <Grid container spacing={2}>
                                    {[3, 4, 5].map((index) => (
                                        <Grid item xs={12} sm={4} key={index}>
                                            
                                        </Grid>
                                    ))}
                                </Grid>
                            </Grid>
                        </Grid>
                    </div>
            </div>
        </div>
    );
};

export default MarketNews;

