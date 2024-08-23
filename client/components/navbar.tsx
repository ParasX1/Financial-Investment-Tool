import {
	Button,
	Link,
	NavbarContent,
	NavbarItem,
	Navbar as Nb,
	Spacer
} from "@nextui-org/react"

export interface NavbarElem {
    label: string
    href: string 
    // only supports jumping to other pages, can replace with
    // action to have it do other things
}

interface NavbarProps {
    children: NavbarElem[]
}

export function Navbar({children} : NavbarProps) {
	// TODO: change the right side to adapt to whether the
	// user is signed in or not ie. only show login/signup when they
	// aren't signed in
      return (
        <Nb maxWidth="full" shouldHideOnScroll>
          <NavbarContent className="hidden sm:flex gap-4" justify="center" >
            {children.map(child => (
                <>
                <NavbarItem>
                    <Link color="foreground" href={child.href}>
                        {child.label}
                    </Link>
                </NavbarItem>
                  <Spacer x={6} />
                </>
            ))}
            </NavbarContent>

			<NavbarContent justify="end">
				<NavbarItem>
                    <Link color="foreground" href="#">
                        Login
                    </Link>
				</NavbarItem>
                  <Spacer x={1} />
				<NavbarItem>
					<Button as={Link} color="primary" href="#" variant="flat">
						Sign Up
					</Button>
				</NavbarItem>
			</NavbarContent>

        </Nb>
      )
}