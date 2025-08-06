
import React from 'react'
import styles from "../styles/footer.module.css";

import FITLogo from '../assets/SidebarIcons/F.png';
import InstagramIcon from '../assets/footer/Instagram.png';
import LinkedInIcon from '../assets/footer/LinkedIn.png';
import TwitterIcon from '../assets/footer/Twitter.png';
import YouTubeIcon from '../assets/footer/YouTube.png'
import Image from "next/image"

function Footer(){
    return(
        <div className={styles.main} >
            <div className={styles.column}>
                <ul>
                    {/* 2. Replace the "FIT" text with an <img> tag */}
                    <li>
                        <Image 
                            src={FITLogo.src} 
                            alt="FIT Logo" 
                            className={styles.fitLogo}
                            width={20}
                            height={20}
                        />
                    </li>
                    <li className={styles.socialRow}>
                        <a href="https://x.com" target="_blank" rel="noopener noreferrer">
                            <Image
                                src={TwitterIcon.src}
                                alt="Twitter"
                                className={styles.socialIcon}
                                width={20}
                                height={20}
                            />
                        </a>
                        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
                            <Image
                                src={InstagramIcon.src}
                                alt="Instagram"
                                className={styles.socialIcon}
                                width={20}
                                height={20}
                            />
                        </a>
                        <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
                            <Image
                                src={LinkedInIcon.src}
                                alt="LinkedIn"
                                className={styles.socialIcon}
                                width={20}
                                height={20}
                            />
                        </a>
                        <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">
                            <Image
                                src={YouTubeIcon.src}
                                alt="YouTube"
                                className={styles.socialIcon}
                                width={20}
                                height={20}
                            />
                        </a>
                    </li>

                    <div > icons by <a className={styles.attribute} href='https://icons8.com'>icons8</a></div>
                </ul>
            </div>
            <div className={styles.column}>
                <ul>
                    <li className={styles.firstLi}>
                        <a> Use cases </a>
                    </li>
                    <li> <a> UI design </a></li>
                    <li> <a> UX design </a> </li>
                    <li> <a> Wireframing </a> </li>
                    <li> <a> Diagramming </a> </li>
                    <li> <a> Brainstorming </a> </li>
                    <li> <a> Online Whiteboard </a> </li>
                    <li> <a> Contacts </a> </li>
                </ul>
            </div>
            <div className={styles.column}>
                <ul>
                    <li className={styles.firstLi}>
                        <a> Explore </a>
                    </li>
                    <li> <a> Design </a> </li>
                    <li> <a> Prototyping </a> </li>
                    <li> <a> Development Features </a> </li>
                    <li> <a> Design Systems </a> </li>
                    <li> <a> Collaboration Features </a> </li>
                    <li> <a> Design Process </a></li>
                    <li> <a> FigJam </a> </li>
                </ul>
            </div>
            <div className={styles.column}>
            <ul>
                    <li className={styles.firstLi}>
                        <a> Resources </a>
                    </li>
                    <li> <a> Blog </a> </li>
                    <li> <a> Best Practices </a> </li>
                    <li> <a> Colors </a> </li>
                    <li> <a> Color wheel </a> </li>
                    <li> <a> Support </a> </li>
                    <li> <a> Developers </a> </li>
                    <li> <a> Resource Library </a> </li>
                </ul>
            </div>
        </div>
    )
}

export default Footer