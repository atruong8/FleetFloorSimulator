# Fleet Floor Simulator AI Usage

- Short Log on examples how I use AI
    - Lets start by working on the core. I want to start with the floor. How do you suggest we approach this?
    - can we start with that plain data object and a small function?
    - Now lets move onto robot, would it make sense this has its own class since it will have an ID and a direction it faces?
    - Next i want to get the UI working for the floor. In the PDF under "1.5 The scenario runner" it looks like there are a list of commands for each component. Lets start wit the floor.
    FLOOR W, H
    So looks like this would be the input when creating the floor.
    - Can we rewrite app.vue. I want the functions be put inside methods: and a data() return. Is that possible? Would it make sense? Whats the norm of writing vue files.
    - Could you separate out <div class="grid-and-x-axis">? or does grid and the x-axis make it easier to be in the same div
    - Just for now lets create it just for floor to confirm it works. Then we can add the full command set later and redo our scenario.
    - Now Can we add the scenario in Module B: Battery and chargers
        FLOOR 3,1
        PLACE R1 0,0,EAST
        QUEUE R1 MOVE MOVE MOVE
        TICK 3
        REPORT BATTERY
        R1 97
    - Ok lets start the implementation, if you can put the BFS in its own function or however, so it's easy to read or easy to spot where the algorthim is taking place. Also add comments as well.

- What I ask for
    - When using AI I would usually ask for implementations of smaller parts before building the bigger thing. For example for the core, i would ask AI to start with the floor and start small. Create a plain and simple data model for the floor. Then gradually implement more as I go through the requirements. I'd then ask AI to create the UI, the tests, edge cases to cover
    - I would also ask for explanations on why it wrote certain codes
    - I ask AI for help with setting up the application and debugging environmental issues with it
    - I also ask AI to add comments for more complicated functions such as finding the shortest route

- What I accepted, rejected, rewrote
    - With the smaller functions and implementations I would go over the changes AI makes and usually accept it. I accepted a lot of the testing and setups from AI because it did a good job on making sure each function is covered
    - I would reject work if the changes is too much or if the way AI writes it doesn't make sense. If i read through the changes and I don't understand it I would reject or rewrite the work and ask it for an explanations
    - I had to have AI rewrite a lot of the code. It piled all the code into one function or into one file which isn't manageable. The code AI creates isn't readable that's when i have it go back break down the different parts of the code and make it more readable.